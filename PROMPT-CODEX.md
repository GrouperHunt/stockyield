# Prompt da incollare in Codex

Sei il responsabile tecnico di StockYield. Lavora direttamente sul progetto allegato fino a ottenere un MVP realmente validato per Vercel. Parlami in italiano, con aggiornamenti brevi. Non uso terminale: esegui tu installazioni, modifiche e test. Io posso usare dashboard GitHub/Vercel, configurare variabili, collegare dominio e firmare transazioni. Non chiedermi scelte tecniche di routine.

## Obiettivo e vincoli
Un'interfaccia non-custodial per fornire USDG a un vault esistente su Robinhood Chain, poi leggere la posizione e prelevare. Budget iniziale indicativo $50, dominio escluso. Nessun contratto proprietario, custodia, database, private key server-side o tokenomics artificiale. Pons resta separato. GitHub → Vercel. Preserva la UI fintech chiara, verde e graphite; testo prodotto inglese. Nessun dato finanziario inventato o APY garantito.

## Cosa è stato implementato
- React/TypeScript, Tailwind, componenti UI, viem. Export convertito da Vinext/Sites a comandi Next.js standard per Vercel.
- Pagina Earn, pannelli Deposit/Withdraw, dettaglio strategia/rischi, My Position e stato transazione.
- GET /api/strategy interroga Morpho GraphQL vaultV2ByAddress e restituisce APY, TVL, liquidità e fee. Refresh frontend ogni 60 secondi.
- Wallet injected via window.ethereum; richiesta connessione e cambio/aggiunta chain.
- ERC20 balance/allowance/approve con allowance limitata all'importo; vault deposit, withdraw, balanceOf, convertToAssets, maxWithdraw; attesa ricevuta.
- Nessun test con fondi reali è stato effettuato. Build/deploy non sono prova di correttezza finanziaria.
- NEXT_PUBLIC_ENABLE_TRANSACTIONS è false/assente per default nell'export: mantiene letture e wallet ma blocca invio. Mantieni il blocco finché i gate non passano. Il sito Sites precedente non è stato modificato.

## Identificatori presenti: da riconfermare prima di abilitare transazioni
Chain ID 4663 (0x1237), ETH per gas.
RPC https://rpc.mainnet.chain.robinhood.com
Explorer https://robinhoodchain.blockscout.com
Vault 0xBeEff033F34C046626B8D0A041844C5d1A5409dd
USDG 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168
API https://api.morpho.org/graphql
Nel codice USDG ha 6 decimals e shares 18: non fidarti dell'hardcoding.

## Lacune concrete, in ordine di priorità
1. Verifica chain ID RPC, bytecode e source/ABI verificati del vault, factory, asset(), decimals(), gates/ruoli/allocazioni e metodo di prelievo appropriato alla specifica versione V2. maxWithdraw non va assunto come liquidità effettiva: controlla semantica e disponibilità degli adapter. Non basta che l'API elenchi il vault.
2. Controlla receipt.status === success per approval, deposit e withdraw. Oggi attendere la ricevuta viene trattato come successo anche senza verificarne lo status. Gestisci revert, timeout, replacement/cancel e hash dell'approval. Se il refresh della posizione fallisce dopo una transazione riuscita, mostra il successo onchain e l'errore di refresh separatamente.
3. Yield Check oggi è parziale: icone statiche, gas valutato solo come saldo ETH > 0, nessuna preview, maxDeposit o simulazione. Implementa veri controlli e stati pending/pass/fail/unknown. Non etichettare la strategia sicura o verificata senza definizione documentata.
4. Simula la transazione prima della firma, stima gas e fee reali; valida importo bigint con massimo 6 decimali confermati e rifiuta input malformati. Verifica shares non nulle, cap, saldo, allowance e max/riscatto. Definisci protezione da cambi del prezzo shares e tolleranze usando soltanto infrastruttura esistente verificata, se necessaria.
5. Wallet: accountsChanged, chainChanged, disconnect, riconnessione ed errori RPC. Rileggi account/chain prima della firma, invalida stato e richieste vecchie quando cambiano. Aggiungi EIP-6963 e, se serve mobile remoto, WalletConnect con project ID configurato da dashboard. Non inventare supporto RainbowKit/wagmi: attualmente non sono implementati. Gestisci il rifiuto 4001 senza tentare add chain; aggiungi chain solo per errore di rete sconosciuta, poi verifica quella attiva.
6. Dati: schema validato, null distinti da zero, timestamp di indicizzazione e freshness reale, timeout/cache/retry. Il timestamp attuale indica solo il fetch. Blocca depositi con dati obsoleti o identità non valida; non impedire inutilmente withdraw a causa di un guasto dell'API APY se onchain è disponibile. Fee in dettaglio oggi hardcoded 0%; rendile live e separa management/performance/StockYield/gas. Definisci periodo avgNetApy o rimuovilo.
7. Portfolio: oggi solo valore corrente, shares e APY. Non mostrare zero mentre una lettura fallisce. Deposito netto e rendimento maturato richiedono storia affidabile inclusi trasferimenti shares; usare API ufficiale se affidabile, altrimenti non mostrarli. Non confondere proiezione annua con profitto realizzato. Prezzi USDG/USD attuali per valutazione in dollari.
8. Estrai adapter YieldStrategy e separa wallet, dati, transazioni e UI: attualmente tutto è nel componente app/stockyield-app.tsx. Nessun adapter multi-strategy esiste ancora. Un solo vault rimane sufficiente.
9. Completa risk copy: liquidità/prelievi, oracle/collateral/bad debt, depeg e curation. La liquidazione riguarda i borrower, ma perdite da liquidazioni insufficienti possono colpire lender. StockYield non è affiliato a Robinhood, Morpho o Steakhouse salvo prova.
10. Vercel: verifica install pulita dal lockfile e build nativa, rimuovi dipendenze Sites/Cloudflare residue solo dopo controllo import. RPC provider affidabile con limiti/chiavi e nessuna esposizione di segreti. Verifica tariffe/termini Vercel per uso commerciale: non assumere Hobby utilizzabile né $0 garantiti. Mantieni COSTS.md aggiornato.

## Verifiche e consegna
Esegui typecheck/build; test mirati per conti/decimali, account/rete cambiati, receipt revert, timeout, API unavailable/stale, allowance insufficiente, cap/liquidità esaurita e deposit/withdraw simulati. Esegui QA desktop/mobile e tastiera. Nessuna firma o uso di fondi senza azione dell'utente. Fornisci prove riproducibili, non soltanto 'build OK'.
Consegna codice, lockfile, .env.example, README senza terminale, COSTS e rapporto con implementato/testato/non verificato. Prepara anteprima Vercel; usa account disponibili senza chiedere credenziali in chat. Abilita transazioni solo dopo validazione tecnica; l'eventuale primo round-trip con fondi minimi viene firmato dall'utente ed è dichiarato non eseguito finché manca. Non definire pronto al pubblico un prodotto con blocchi P0 aperti. Non introdurre altre strategie per mascherare problemi della prima.
