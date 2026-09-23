# Procedura guidata per il primo test reale (fondi minimi, firmati da te)

Questa procedura presuppone che l'app sia già pubblicata su un **deployment Vercel ad accesso limitato** (vedi sezione "Deployment pilota" più sotto) con `NEXT_PUBLIC_ENABLE_TRANSACTIONS=true` **solo lì**, mentre Production resta `false`. Non procedere se questa separazione non è confermata.

Usa un importo minimo (es. 1–5 USDG): l'obiettivo è verificare il ciclo, non il rendimento.

## Passo 0 — Prerequisiti sul tuo wallet
- Un wallet browser (MetaMask, Rabby, ecc.) con una piccola quantità di **ETH nativo** per il gas su Robinhood Chain (chain ID 4663) e almeno l'importo minimo di **USDG** che vuoi depositare.
- **Cosa devi vedere**: il tuo wallet ha un saldo ETH > 0 su Robinhood Chain. Se non hai ETH lì, questa procedura si ferma qui: serve prima un modo per farlo arrivare (bridge/exchange — fuori dallo scope di questo codice).

## Passo 1 — Connessione
1. Apri l'URL del deployment pilota.
2. Clicca "Connect wallet".
3. Approva la connessione nel wallet.

**Cosa devi vedere**: l'header mostra il tuo indirizzo abbreviato al posto di "Connect wallet". Se hai più wallet installati, l'app ti chiede quale usare prima di procedere.
**Come confermare**: nessuna transazione ancora — è solo una connessione, non firma nulla che muova fondi.

## Passo 2 — Controllo rete e asset
**Cosa devi vedere**: 
- Nessun banner giallo "Your wallet is on the wrong network". Se compare, clicca il pulsante e conferma il cambio rete nel wallet (l'app non aggiunge la rete automaticamente se il wallet la rifiuta — solo se non la conosce).
- Il riquadro "Yield Check" mostra tutte le spunte verdi tranne eventualmente l'importo (non hai ancora digitato nulla): "No allowlist gate active" deve avere la spunta verde (verificato live contro il contratto, non un valore fisso).
- Il saldo USDG del wallet visualizzato in "Wallet balance" corrisponde a quello che vedi nel tuo wallet.

**Come confermare on-chain**: apri l'indirizzo del tuo wallet su [Blockscout](https://robinhoodchain.blockscout.com) e confronta il saldo USDG.

## Passo 3 — Importo minimo
1. Digita l'importo minimo scelto (es. "1").
2. **Cosa devi vedere**: il controvalore in dollari sotto il campo si aggiorna; "Estimated annual yield" mostra una cifra coerente con l'APY corrente; il pulsante diventa "Earn with USDG" (non più grigio), a meno che manchi qualcosa (gas, saldo).

## Passo 4 — Approvazione (limitata all'importo)
1. Clicca "Earn with USDG".
2. Se è la prima volta che usi questo wallet con il vault, il tuo wallet ti chiederà di firmare un'**approvazione** — controlla che l'importo mostrato nel wallet corrisponda esattamente a quello digitato (l'app richiede sempre un'allowance pari all'importo, mai illimitata).
3. Firma.

**Cosa devi vedere**: il dialog "Confirm in your wallet" mostra "Allow the vault to use the selected USDG", con uno spinner, poi passa da solo al passo successivo.
**Come confermare on-chain**: il link "View transaction" nel dialog porta a Blockscout; lo stato della transazione deve essere "Success".

## Passo 5 — Deposito
Dopo l'approvazione, l'app chiede automaticamente la firma del deposito vero e proprio.

**Cosa devi vedere**: il dialog passa a "Deposit USDG directly into Morpho", poi a "Transaction confirmed" con un segno di spunta.
**Come confermare on-chain**: la seconda transazione su Blockscout deve avere status "Success" e un evento `Transfer` di USDG dal tuo indirizzo verso il vault, oltre a un evento `Transfer` di shares (token del vault) dall'indirizzo zero verso il tuo indirizzo (il "mint" delle shares).
**Se qualcosa va storto**: l'app non mostra mai "successo" se `receipt.status` non è `success` — un revert produce un messaggio d'errore esplicito, mai un falso positivo.

## Passo 6 — Posizione
**Cosa devi vedere**: nella sezione "My position", "Current value" mostra circa l'importo depositato (può differire di pochi decimali per via dello share price), "Vault shares" mostra un numero di shares coerente.
**Come confermare on-chain**: `balanceOf(tuo indirizzo)` sul contratto vault (via Blockscout, tab "Read Contract") deve corrispondere alle shares mostrate; `convertToAssets(quelle shares)` deve corrispondere al valore mostrato.

## Passo 7 — Prelievo
1. Passa al tab "Withdraw".
2. Digita lo stesso importo minimo (o clicca "MAX" per prelevare tutto).
3. Firma quando richiesto.

**Cosa devi vedere**: se l'importo supera l'ultima liquidità disponibile riportata (poco probabile con un importo minimo), un avviso giallo non bloccante te lo segnala prima di firmare. Il dialog passa a "Return USDG to your wallet" poi a "Transaction confirmed".
**Come confermare on-chain**: la transazione `withdraw` su Blockscout con status "Success"; il tuo saldo USDG nel wallet (e su Blockscout) aumenta dell'importo prelevato; le shares nella sezione posizione diminuiscono o arrivano a zero.

## Se qualcosa non torna
- **Il wallet mostra un importo di approvazione diverso da quello digitato**: non firmare, chiudi la finestra e segnalamelo — non dovrebbe mai succedere con questa versione del codice.
- **La transazione fallisce con un messaggio leggibile** (non un errore grezzo): è il comportamento atteso quando qualcosa blocca l'operazione (saldo, allowance, liquidità) — segnalamelo comunque per verificare che il messaggio sia corretto.
- **Il sito mostra "successo" ma su Blockscout la transazione è "Failed"**: questo non dovrebbe poter succedere (controlliamo sempre `receipt.status`) — se accade, è un bug critico da fermare subito.

---

# Deployment pilota — come separare Preview (transazioni attive) da Production (transazioni bloccate)

Questo usa solo funzionalità Vercel già esistenti, nessun codice aggiuntivo.

1. Su Vercel, nel progetto StockYield: **Settings → Environment Variables**.
2. Variabile `NEXT_PUBLIC_ENABLE_TRANSACTIONS`:
   - Per l'ambiente **Production**: valore `false`.
   - Per l'ambiente **Preview**: valore `true`.
3. Crea un branch dedicato (es. `pilot-test`) e fai push: Vercel genera automaticamente un deployment Preview con URL dedicato, che builda con `true`.
4. **Restringi l'accesso a quell'URL** prima di condividerlo con te stesso: Settings → Deployment Protection → attiva "Vercel Authentication" (richiede login Vercel) o "Password Protection" per i deployment Preview. Senza questo, l'URL Preview è comunque pubblico se qualcuno lo indovina.
5. Verifica prima di firmare: apri l'URL Preview, controlla che il pulsante NON mostri "Transactions pending validation" — se lo mostra ancora, la variabile non è stata applicata a quel deployment (serve un nuovo deploy dopo aver impostato la variabile).
