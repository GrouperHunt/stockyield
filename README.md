# StockYield — export per Vercel

Questo pacchetto contiene il sorgente dell'app e una configurazione Next.js per Vercel. Non include node_modules, output compilati, credenziali o metadati privati Sites. Le dipendenze si installano dal lockfile.

## Stato reale
Il sito ha 4 pagine: **Earn** (`/`), **Position** (`/position`), **How it works** (`/how-it-works`) e **Risks & FAQ** (`/risks`), con il design descritto in [DESIGN.md](DESIGN.md) (nessuna libreria di animazione aggiunta). La lista di cosa è stato provato con test automatici e cosa no è in [VALIDATION.md](VALIDATION.md); il test con wallet reale non è ancora stato fatto.

UI e chiamate ai contratti sono implementate, con controllo di successo delle transazioni (status della receipt), simulazione pre-firma, validazione dell'importo, gestione eventi wallet (account/rete/disconnessione) e dati di mercato con controllo di freschezza. Il vault è stato confrontato con il suo sorgente ufficiale (morpho-org/vault-v2): i quattro gate di accesso sono verificati on-chain come disattivati (nessuna whitelist, nessuna autorizzazione speciale per depositare/prelevare), e l'app ricontrolla questo stato periodicamente invece di darlo per scontato. Un ciclo completo approve → deposit → posizione → withdraw è stato eseguito con successo su un fork locale dello stato reale della chain (fondi di test, nessun conto reale coinvolto) — vedi [VALIDATION.md](VALIDATION.md) per la diagnosi completa, le correzioni rispetto a una diagnosi precedente errata, e la lista dettagliata simulato/fork/da verificare con te. Nessuna transazione è ancora stata firmata con fondi reali: vedi [PILOT.md](PILOT.md) per la procedura guidata del primo test e per come isolare un deployment con le transazioni attive senza toccare Production.

Le transazioni sono BLOCCATE per default tramite NEXT_PUBLIC_ENABLE_TRANSACTIONS; wallet e letture rimangono disponibili. Non attivarle prima delle verifiche elencate nel prompt, in particolare il primo depositi/prelievo con importo minimo firmato da te. L'accesso privato Sites non viene trasferito: il deployment Vercel ha le proprie impostazioni di accesso.

## Passaggio a GitHub e Vercel senza terminale
1. Estrai lo ZIP. In Codex apri la cartella stockyield-vercel e incolla PROMPT-CODEX.md per completare e validare l'app.
2. Crea un repository GitHub. Carica il CONTENUTO della cartella, con package.json alla radice (inclusi .gitignore e .env.example). In alternativa chiedi a Codex di collegare e caricare il repository.
3. In Vercel: Add New → Project → importa il repository. Framework: Next.js; Root Directory: la cartella che contiene package.json; Build Command: pnpm build; Output Directory: default Next.js. Usa Node 24.x, coerente con la verifica locale. Lascia Install Command su automatico.
4. Configura NEXT_PUBLIC_ENABLE_TRANSACTIONS=false per Preview e Production. Deploy. L'app può essere pubblicata per revisione; questo non equivale ad abilitarla finanziariamente. Se il piano non consente protezione, assumi l'URL accessibile al pubblico.
5. Solo dopo i gate tecnici, configurare true e fare un nuovo deploy (variabile compilata nel client). Nessun dato segreto, seed o private key va inserito.

Vercel importa un repository Git: lo ZIP non è un caricamento diretto nella dashboard di deploy.

## Export
Gli script Sites/Vinext/Cloudflare sono sostituiti da next dev/build/start; rimossi file di runtime specifici e database inutilizzato. Le dipendenze di build non più usate (drizzle, vinext, vite/plugin, wrangler, Cloudflare, react-server-dom-webpack) sono state rimosse dopo aver verificato che nessun file le importa; il lockfile è stato rigenerato di conseguenza (`pnpm install` risultante: -141 pacchetti). Il codice dell'app è preservato salvo blocco esplicito delle transazioni.

Vedere VALIDATION.md per gli esiti effettivi. Non sono incluse chiavi API; Morpho API e RPC pubblico sono configurati nel sorgente e richiedono accessibilità dalla produzione.
