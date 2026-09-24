# Test del ciclo completo sulla preview — 1 USDG

Sito da provare (solo tu, dietro il tuo login Vercel):
https://stockyield-vercel-git-redesign-mauripalm24-4207s-projects.vercel.app

Firmi solo tu, dal tuo wallet. Non condividere mai seed phrase, chiavi private o password: il sito non le chiede e io nemmeno.
Importo di prova: **1 USDG**. Ti serve anche un po' di ETH su Robinhood Chain per le commissioni di rete.

---

## Passo 0 — Il pulsante è attivo?
Apri il sito e guarda il pulsante grande nel riquadro "Earn with USDG".
- **Devi vedere:** "Connect Wallet" (verde).
- **Se vedi "Transactions pending validation":** fermati. Questo sito non ha le transazioni accese. Dimmelo.

## Passo 1 — Collega il wallet
Clicca **Connect Wallet** in alto a destra e conferma nel wallet.
- **Devi vedere:** al posto del pulsante il tuo indirizzo abbreviato (0x…).
- **Se il wallet non si apre:** ricarica la pagina; se hai più wallet installati scegli quello che vuoi dalla finestra che compare.

## Passo 2 — Rete giusta
- **Devi vedere:** nel riquadro, sotto "Where do the funds go?", la riga "Wallet is on Robinhood Chain" con **Passed**.
- **Se vedi una striscia gialla "wrong network":** clicca il pulsante verde "Switch to Robinhood Chain" e conferma nel wallet. Se rifiuti, non succede nulla di grave: riprova.

## Passo 3 — Saldo e posizione di partenza
- **Devi vedere:** "Balance … USDG" nel riquadro, uguale al saldo USDG nel tuo wallet.
- Vai alla pagina **Position** (menu in alto): deve dire **"No position yet. Deposit USDG to get started."**
- **Se vedi "Loading…" a lungo o "Unable to load your position.":** premi **Retry**. Se resta così, dimmelo (non deve mai mostrarti "0" al posto di un errore).

## Passo 4 — Inserisci 1 USDG
Torna a **Earn**, scheda **Deposit**, scrivi `1`.
- **Devi vedere:**
  - "Estimated annual yield" con sotto la scritta *Estimate at current variable APY. Not guaranteed.*
  - Nel **Yield Check**: "Transaction simulation" con **Passed**, "Network fee (estimate)" con un valore in ETH, "ETH for gas in your wallet" **Passed**, e in alto **READY TO SIGN**.
  - Sotto: "2 signatures: Step 1 Approve USDG (limited to this amount) → Step 2 Deposit USDG".
  - Il pulsante verde dice **Earn with USDG**.
- **Se il pulsante è grigio:** leggi cosa dice, ti spiega il motivo (es. "Enter an amount", "ETH needed for gas", "Simulation failed"). Fai uno screenshot e dimmelo.

## Passo 5 — Approve (prima firma)
Clicca **Earn with USDG**.
- **Devi vedere nel wallet:** una richiesta di approvazione. **Controlla che l'importo sia 1 USDG, non "illimitato".** Se è illimitato, **non firmare** e dimmelo.
- **Sul sito:** finestra "Waiting for wallet" → dopo la firma "Submitted" → "Step 1 of 2 · Approve USDG" diventa Confirmed.

## Passo 6 — Deposit (seconda firma)
- **Devi vedere:** nella finestra "Deposit simulation (after approval)" con **Passed**, poi il wallet ti chiede la seconda firma. Firma.
- **Alla fine:** titolo **Confirmed** e "Your transaction succeeded on-chain".
- **Controllo sulla chain:** clicca "View transaction on the explorer". Deve dire **Success**. Fai lo stesso con la transazione di approvazione se vuoi.

## Passo 7 — La posizione
Chiudi la finestra (**Done**) e vai su **Position**.
- **Devi vedere:** "Position value" circa **1 USDG** (può essere 0,99999… : è normale), shares maggiori di zero, "Last read" con l'orario di adesso.
- **Se vedi ancora "No position yet":** premi il pulsante di refresh (frecce) accanto al valore. Se dopo 1 minuto è ancora vuoto, dimmelo con il link della transazione.

## Passo 8 — Prelievo
Nella pagina Position clicca **Withdraw**, nel riquadro a destra premi **MAX** (non scrivere 1: il valore può essere 0,999999 e MAX evita l'errore per un soffio).
- **Devi vedere:** "You receive (estimate) ≈ … USDG", "Recipient" con il tuo indirizzo, Yield Check con **Passed**, pulsante **Withdraw USDG**.
- Clicca, firma nel wallet.
- **Alla fine:** **Confirmed**, il saldo USDG nel wallet torna a circa quello di partenza (meno nulla: le commissioni sono in ETH), la posizione scende a ~0.
- **Se vedi "Amount exceeds withdrawable":** la liquidità del vault in quel momento è bassa. Non è un errore del sito: riprova più tardi o con un importo minore, e dimmelo.

## Cosa significano i messaggi della finestra
| Titolo | Significa | Cosa fare |
|---|---|---|
| Waiting for wallet | Aspetta la tua firma | Conferma nel wallet |
| Submitted | Inviata, in attesa | Aspetta |
| Confirmed | Riuscita sulla chain | Niente |
| Failed | Non è andata a buon fine (motivo scritto) | Non è stato speso nulla di importante oltre al gas; dimmi il motivo |
| Rejected by user | Hai rifiutato nel wallet | Nulla è stato inviato per quel passo; puoi riprovare |
| Still pending | Inviata ma non ancora confermata | **Non reinviare.** Apri il link dell'explorer e aspetta; poi "Close and refresh position" |

## Alla fine dimmi
1. Cosa diceva il pulsante al passo 0.
2. Ogni passo: ok / problema (con screenshot se c'è un problema).
3. I link Blockscout dell'approvazione, del deposito e del prelievo.

Quando mi confermi che tutto il ciclo funziona, preparo il passaggio in production.
