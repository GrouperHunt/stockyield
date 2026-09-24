# Validazione — stato dopo la diagnosi approfondita e i test su fork

Ambiente: macOS, Node v25.6.1, pnpm 11.25.0, Next.js 16.3.4, Foundry 1.6.0-nightly (anvil/cast, aggiornato da questa sessione da una build di gennaio 2024 — vedi nota sotto).

## CORREZIONE rispetto alla versione precedente di questo documento
La versione precedente riportava: *"previewDeposit va in revert per un indirizzo generico... il vault ha quindi gate/allowlist"*. **Questa diagnosi era sbagliata ed è stata smentita**: il revert era causato da una mia chiamata `eth_call` con `calldata` malformato (31 byte invece di 32 — un errore di codifica manuale in curl, non del contratto). Ripetendo la chiamata con l'argomento codificato correttamente, `previewDeposit` funziona normalmente per qualunque importo testato (1, 500'000, 999'999, 1'000'000, 1'000'001, 2'000'000, 1e8, 1e9 — tutti con esito atteso, ripetuto 5 volte di seguito senza variazioni). Mi scuso per l'errore: lo correggo qui con evidenza riproducibile invece di lasciarlo silenziosamente nel documento precedente.

## 1) Diagnosi del vault — verificata con il sorgente reale, non per deduzione

**Fonte usata**: sorgente ufficiale `morpho-org/vault-v2` (`src/VaultV2.sol`, licenza GPL-2.0, scaricato da `raw.githubusercontent.com` in questa sessione) confrontato riga per riga con il bytecode e lo stato effettivamente deployato all'indirizzo `0xBeEff033F34C046626B8D0A041844C5d1A5409dd` su Robinhood Chain (chain ID 4663, RPC pubblico), letto con `eth_call` al blocco 70'656'028 (23/09/2026) e riverificato più tardi allo stesso indirizzo.

**Scoperta più importante**: nel sorgente reale, `maxDeposit`, `maxMint`, `maxWithdraw`, `maxRedeem` sono funzioni `pure` che **restituiscono sempre 0**, per progetto:
```solidity
/// @dev Gross underestimation because being revert-free cannot be guaranteed when calling the gate.
function maxDeposit(address) external pure returns (uint256) { return 0; }
```
Confermato anche via `eth_call` diretto: `maxDeposit()` restituisce `0` per **qualsiasi** indirizzo testato (l'indirizzo del vault stesso, l'indirizzo USDG, due indirizzi arbitrari, l'indirizzo zero) — non è un allowlist su un account specifico, è una funzione che non calcola mai nulla. **La versione precedente dell'app (compresa quella che avevo appena consegnato) usava `maxDeposit`/`maxWithdraw` per bloccare/limitare gli importi: questo era un bug che avrebbe reso il deposito permanentemente impossibile ("supera il cap del vault" per qualunque cifra) e il prelievo sempre mostrato come "0 disponibile".** L'ho rimosso e sostituito con il meccanismo corretto (sotto).

**Il vero meccanismo di accesso** sono quattro contratti "gate" separati, ciascuno disattivato quando impostato all'indirizzo zero (per progetto: *"Set to 0 to disable a gate"*):
| Gate | Funzione | Letto on-chain (23/09/2026) |
|---|---|---|
| `receiveSharesGate` | limita chi può ricevere shares (depositare) | `0x0000…0000` → **disattivato** |
| `sendSharesGate` | limita chi può inviare shares (prelevare) | `0x0000…0000` → **disattivato** |
| `receiveAssetsGate` | limita chi può ricevere asset (prelevare) | `0x0000…0000` → **disattivato** |
| `sendAssetsGate` | limita chi può inviare asset (depositare) | `0x0000…0000` → **disattivato** |

**Risposta diretta alla tua domanda**: sì, un wallet esterno qualunque può depositare e prelevare tramite la nostra UI, senza whitelist, KYC o autorizzazione speciale. Non è una deduzione dal solo assente-di-revert: è stato **eseguito realmente** (vedi punto 2) da un wallet di test senza alcun privilegio.

**Nessun blocco di fattibilità trovato.** Se in futuro Steakhouse/Morpho attivasse uno di questi gate, l'app lo rileva: `loadGates()` in [stockyield-app.tsx](app/stockyield-app.tsx) legge i quattro indirizzi ogni 5 minuti e disabilita il pulsante di transazione con un messaggio esplicito ("Vault gate active — paused") invece di lasciar fallire silenziosamente una transazione.

Il vincolo reale che resta è quello dell'adapter di liquidità (`liquidityAdapter`, letto on-chain: `0x44ab...79c2`): i depositi vengono allocati lì con controlli di cap per mercato (`absoluteCap`/`relativeCap`, veri `require` nel sorgente), e i prelievi attingono prima alla liquidità idle del vault e poi disallocano dall'adapter. Se un prelievo richiede più di quanto l'adapter può liberare in quel momento, la transazione reverte — è un rischio di mercato reale (già descritto in "Liquidity and withdrawal risk" nella scheda rischi), non un bug né un gate nascosto.

## 2) Test eseguiti — con distinzione esplicita tra simulato, fork locale e chain reale

### (a) Simulato (lettura `eth_call`/`simulateContract`, nessuna transazione, nessun gas speso)
- Indirizzi, decimali, nomi/simboli di vault e USDG: confermati via `eth_call` diretto (vedi sessione precedente).
- I quattro gate: confermati a `0x0` via `eth_call` diretto.
- `previewDeposit`/`previewMint`/`previewWithdraw` per vari importi: eseguiti con successo via `eth_call`.
- `client.simulateContract(...)` — lo stesso identico pre-flight che l'app esegue prima di ogni firma — eseguito con lo stesso ABI e client (`viem`) del codice reale contro il fork (vedi punto b), per tre scenari di revert (sotto).

### (b) Eseguito su un fork locale (Anvil, fork di Robinhood Chain) — reversibile, nessun fondo reale, nessuna chiave dell'utente
Uno snapshot locale, effimero, dello stato reale della chain (bytecode e storage del vault, di USDG e di tutti gli altri contratti, identici all'originale). Ho finanziato un account di test **usando esclusivamente le chiavi di test pubbliche e note di Anvil** (account #0, chiave `0xac09...2ff80`, un valore standard di sviluppo senza alcun valore reale, mai associato a fondi veri) impersonando temporaneamente il vault stesso (che detiene ~3,8M USDG idle) per trasferire 5'000 USDG di test all'account. Nessuna chiave dell'utente, nessuna rete reale, nessuna transazione mai trasmessa alla mainnet.

**Nota tecnica rilevante**: il primo tentativo con la versione di Anvil già installata (build di gennaio 2024) falliva con un errore generico `EVM error NotActivated` sul deposito — ho verificato che **non è un errore del vault** (l'errore non esiste nel codice sorgente del contratto) ma un limite del binario Anvil obsoleto, probabilmente sull'emulazione di storage transiente (EIP-1153) usato da pattern moderni di reentrancy-guard. Ho aggiornato Foundry (`foundryup`, ora 1.6.0-nightly) e il problema è sparito. Lo segnalo per trasparenza, esattamente come la correzione del punto precedente: un errore di ambiente di test, non del prodotto.

Ciclo completo eseguito con successo, wallet senza alcun privilegio speciale:
1. `approve(vault, 1000 USDG)` → **status: success**
2. `deposit(1000 USDG, receiver=tester)` → **status: success**, shares ricevute: 992.22 (coerente con lo share price ~1.0078 letto dall'API)
3. `convertToAssets(shares)` → 999.999999 USDG (valore posizione corretto, dust da arrotondamento)
4. `withdraw(500 USDG, receiver=tester, owner=tester)` → **status: success**, saldo USDG del wallet passato da 4'000 a 4'500, shares ridotte coerentemente

Scenari di revert reali, prodotti dal contratto vero (non inventati):
- **Prelievo superiore alla posizione residua** (600 USDG con ~500 disponibili): `panic: arithmetic underflow or overflow (0x11)` — lo stesso identico errore riprodotto anche con `client.simulateContract` (il pre-flight della nostra app), confermando che l'app lo intercetta **prima** di chiedere la firma.
- **Prelievo su un `owner` diverso senza autorizzazione** (address(0) del secondo account Anvil, nessuna allowance): stesso `panic` di underflow — anche questo intercettato da `simulateContract`.
- **Deposito senza allowance sufficiente**: revert con l'errore custom del vault `TransferFromReverted` (selettore `0xe65b7a77`, definito in `ErrorsLib.sol`), anch'esso intercettato da `simulateContract`.
- **Deposito di 0 USDG**: non va in revert (il contratto lo accetta come no-op, 0 shares emesse) — non un problema perché la nostra UI non permette mai di inviare un importo pari a zero.

Ho aggiunto questi tre pattern di errore reali (non ipotetici) a `describeTxError` in [lib/vault.ts](lib/vault.ts) così l'utente vede un messaggio comprensibile invece del panic grezzo.

### (c) Test di logica pura (Node, senza rete né chain — validano il codice, non il contratto)
15 asserzioni eseguite con successo (`node --experimental-strip-types`, nessun framework, solo `node:assert`):
- `parseStrategy`: accetta una risposta ben formata; **rifiuta** risposta nulla/assente (API indisponibile); rifiuta un indirizzo vault o asset che non coincide con le nostre costanti (difesa in profondità contro una risposta manomessa o un vault sbagliato); rifiuta campi numerici non finiti (NaN/Infinity/stringa); tratta un prezzo USDG assente come `null` esplicito, mai come 0 o 1.
- `sanitizeAmountInput`: tronca a 6 decimali; rimuove un secondo punto decimale; rimuove lettere/simboli.
- `parseAmount`: 0 per input vuoto/zero/negativo; conversione corretta a 6 decimali.
- `describeTxError`: riconosce il rifiuto utente (4001); traduce in linguaggio semplice sia il panic di underflow sia l'errore custom `TransferFromReverted` **osservati realmente al punto (b)**, non ipotizzati; preserva verbatim i nostri messaggi di receipt-reverted.

### (d) Verificato per lettura del codice (non eseguito automaticamente — richiederebbe un'estensione wallet reale in un browser)
- **Cambio account/rete durante un'operazione**: `transact()` in [stockyield-app.tsx](app/stockyield-app.tsx) rilegge `eth_accounts` subito prima di firmare e interrompe con un errore esplicito se l'account differisce da quello mostrato in UI; `ensureChain()` verifica la chain attiva prima di ogni transazione. Gli event listener `accountsChanged`/`chainChanged`/`disconnect` invalidano posizione e dialog di transazione aperti. Non ho un'estensione wallet reale in questo ambiente per generare l'evento del browser, quindi questo resta verificato per lettura del codice, non con un test automatizzato end-to-end.
- **Successo on-chain con refresh posizione fallito**: `loadPosition()` intercetta i propri errori internamente (`positionError`) e non li propaga; il passo `setStep("done")` (mostrato nel dialog di transazione) avviene **prima** della chiamata a `loadPosition()` e non dipende dal suo esito — quindi un refresh fallito dopo un deposito riuscito mostra "Transaction confirmed" nel dialog e separatamente "Unavailable" nella sezione posizione, mai uno zero silenzioso.
- **API indisponibile/stale**: `route.ts` avvolge l'intera pipeline fetch+validazione in un unico try/catch che restituisce sempre 503 su qualunque fallimento (timeout, rete, shape inattesa) — verificato per lettura, oltre alla chiamata live già testata in precedenza.

### (e) Non eseguito — richiede te
- Nessuna transazione firmata con fondi reali sulla mainnet di Robinhood Chain.
- Nessun test con un'estensione wallet reale (MetaMask/Rabby) connessa nel browser.
- Separazione ambienti Vercel: verificata **a livello di build locale** (vedi sotto), non ancora su un deployment Vercel reale.

## 3) Separazione Preview/Production — verificata a livello di build
`NEXT_PUBLIC_ENABLE_TRANSACTIONS` è una variabile Next.js "public": viene inserita staticamente nel bundle e nell'HTML prerenderizzato al momento della build, non letta a runtime. Ho compilato il progetto due volte, una con `false` e una con `true`, e confrontato l'HTML statico generato (`.next/server/app/index.html`): con `false` il pulsante mostra il testo fisso "Transactions pending validation" ed è disabilitato; con `true` non compare affatto quel testo (il pulsante torna al normale "Connect wallet"/"Earn with USDG" secondo lo stato del wallet). Le due build sono concretamente diverse nel file HTML prodotto — **la separazione funziona per come Vercel gestisce le variabili per Preview vs Production** (ogni ambiente builda con il proprio valore). Non ho ancora potuto verificarlo su un deployment Vercel reale perché non ho accesso al tuo account.

## Correzioni del 24/09/2026 (branch `redesign`, un commit per correzione)
Errori miei, trovati confrontando il sito con il brief. Ora corretti e provati con un wallet finto nel browser (nessuna chiave, nessun fondo):
1. **Affermazione sbagliata in questo file e nei miei report**: "il prelievo resta disponibile se l'API Morpho è giù". Era falso: il pulsante e `transact()` richiedevano i dati strategia, quindi un'API non disponibile bloccava anche il prelievo. Corretto (commit "Morpho API outage blocked withdrawals"): solo il deposito dipende dai dati strategia. Provato: con `/api/strategy` a 503 e posizione finta, "Withdraw USDG" è attivo e "Earn with USDG" resta disabilitato.
2. **Switch network non cliccabile**: il pulsante era disabilitato proprio sulla rete sbagliata. Ora è attivo e cambia rete (anche a transazioni disabilitate: non muove fondi). Rifiuto (4001) e errore tecnico sono distinti, nessun `addChain` dopo un rifiuto. Provato con wallet finto sulla chain 0x1, con accettazione e con rifiuto.
3. **Timeout della receipt mostrato come errore**: ora "Still pending" con link all'explorer e l'avviso di non rinviare. Provato simulando una receipt che non arriva mai e avanzando l'orologio del browser di 200 s. Non provato con una transazione realmente lenta sulla chain.
4. **Zero al posto di sconosciuto in Position**: durante il caricamento o dopo un cambio account si vedeva "$0.00 supplied" / "0" shares. Ora "Loading…" (e "Unavailable" se la lettura fallisce); al cambio account la posizione precedente viene azzerata. Provato con risposte RPC ritardate.
5. **Frase falsa nei rischi**: "This app shows your live withdrawable amount" — l'app non lo mostra, simula il prelievo prima della firma. Testo corretto.

Riproduzione dei punti 1–4: `tests/mock-wallet-fixes.mjs` (12 controlli, tutti superati; vedi l'intestazione del file per come eseguirli). Limite: il wallet è un oggetto JavaScript finto e l'RPC è intercettato: prova la logica dell'interfaccia, non la chain né un wallet reale.

## Riepilogo modifiche di questa sessione
1. Rimosso l'uso di `maxDeposit`/`maxWithdraw` come blocco/limite (bug che avrebbe reso impossibile ogni deposito e mostrato sempre "0" disponibile per il prelievo) — sostituito con lettura diretta dei quattro gate (`gateAbi` in [lib/vault.ts](lib/vault.ts)) e con il saldo posizione reale (`convertToAssets`) come base per il prelievo.
2. Aggiunta la verifica periodica (ogni 5 minuti) dello stato dei gate, con blocco esplicito e messaggio chiaro se un gate viene attivato in futuro.
3. Aggiunto un avviso (non bloccante) quando l'importo di prelievo richiesto in USD supera l'ultima liquidità disponibile riportata dall'API — il blocco reale resta la simulazione pre-firma, non questo avviso.
4. Arricchito `describeTxError` con i pattern di revert reali osservati sul fork (underflow su importo eccessivo, `TransferFromReverted` su allowance insufficiente).
5. Corretta la diagnosi errata di `previewDeposit` della sessione precedente.
6. Aggiornato Foundry (anvil/forge/cast) da una build di gennaio 2024 a 1.6.0-nightly per eliminare un falso positivo dell'ambiente di test locale.
