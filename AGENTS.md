# Note per Codex e Assistenti

Questo progetto e personale ed e mantenuto da una sola persona. Le soluzioni devono aiutare il maintainer a lavorare meglio, non introdurre processi o architetture da team grande.

## Contesto

- Nome app stabile attuale: `Where's My Money?`.
- Nome breve per scorciatoia mobile/PWA: `WMM`.
- Nome repository target: `tracker-spese`.
- Scopo: tracker spese semplice, privato, locale.
- Uso reale: quotidiano su Android.
- Deploy: GitHub Pages / hosting statico.
- Backend: assente.
- Persistenza: `localStorage`.
- Stack: HTML, CSS, JavaScript vanilla, Chart.js da CDN.
- Lingua documentazione e UI: italiano.
- Obiettivo distribuzione: app installabile/offline stabile, con aggiornamenti scelti dall'utente da una lista di versioni pubblicate dal maintainer.
- Branch stabile attuale: `main`.
- Branch di lavoro/refactor: `codex/refactor`.
- GitHub Pages deployata oggi: versione da `main`, usata dal maintainer e da amici per uso quotidiano.
- Esigenza immediata prima/durante il refactor: avere un link stabile per l'uso quotidiano e un link separato per testare la versione di sviluppo.
- Vincolo importante: se stabile e dev sono servite dallo stesso dominio GitHub Pages, anche con path diversi, condividono `localStorage`; la versione dev deve quindi usare una storage key separata o un'origine diversa per non rischiare i dati reali.

## Priorita Operative

1. Non rompere l'uso quotidiano.
2. Non mettere a rischio i dati locali.
3. Separare canale stabile e canale di sviluppo prima dei refactor rischiosi.
4. Mantenere l'app semplice e comprensibile.
5. Migliorare la struttura prima di aggiungere grandi feature.
6. Trattare Android come piattaforma primaria.

## Prima di Modificare Codice

Leggere, nell'ordine:

1. `README.md`;
2. `docs/CURRENT_STATE.md`;
3. `docs/CODE_REVIEW.md`;
4. `docs/DEVELOPMENT_GUIDE.md`;
5. `docs/ROADMAP.md`;
6. `note/note_di_progetto.txt` se si lavora su backlog o dettagli storici.

Non considerare `note/note_di_progetto.txt` come specifica finale: e una raccolta raw di appunti. La roadmap curata decide priorita e raggruppamenti, ma gli appunti possono contenere dettagli utili non ancora formalizzati.

## Documentazione Ufficiale

I file documentali ufficiali da mantenere allineati sono:

- `README.md`: panoramica pubblica, struttura, link alla documentazione e istruzioni essenziali.
- `AGENTS.md`: contesto operativo per Codex e altri assistenti AI.
- `docs/CURRENT_STATE.md`: stato tecnico implementato.
- `docs/CODE_REVIEW.md`: rischi tecnici, priorita e ordine consigliato del refactor.
- `docs/DEPLOYMENT_STRATEGY.md`: separazione stabile/dev e strategia GitHub Pages.
- `docs/DEVELOPMENT_GUIDE.md`: regole pratiche per sviluppo, refactor e nuove feature.
- `docs/ROADMAP.md`: backlog curato e ordinato a partire dagli appunti.
- `note/note_di_progetto.txt`: appunti raw e storici del maintainer.

Non creare altri file di documentazione senza una ragione chiara. Se serve un nuovo documento, aggiornare anche `README.md` e questa lista.

## Comunicazione con il Maintainer

- Dopo ogni modifica, spiegare in chat cosa e stato cambiato e perche.
- Quando la modifica tocca codice non banale, descrivere anche il comportamento interessato, non solo i file modificati.
- Segnalare rischi residui, test eseguiti e test non eseguiti.
- Aiutare il maintainer a costruire comprensione del codice: evitare risposte opache tipo "fatto" quando una spiegazione breve puo rendere piu chiaro il sistema.
- Se una scelta non e deducibile dalla codebase o dagli appunti, chiedere al maintainer invece di inventare una policy complessa.

## Vincoli

- Evitare framework e build step finche non sono chiaramente necessari.
- Evitare refactor larghi e simultanei.
- Prima dei refactor larghi, affrontare o almeno considerare i rischi in `docs/CODE_REVIEW.md`.
- Lavora sempre sulla versione dev su `codex/refactor`, mai sulla versione stabile su `main`.
- Non cambiare schema dati senza fallback per vecchi dati.
- Non rimuovere workaround mobile senza capire quale bug risolvevano.
- Non sostituire i `textarea` usati come input/dropdown senza verificare l'effetto sui suggerimenti/autofill della tastiera mobile.
- Non rendere persistente il toggle tema dell'header: e intenzionalmente temporaneo; la persistenza sta nelle impostazioni.
- Non introdurre dipendenze che impediscano il deploy statico semplice.
- Non progettare aggiornamenti automatici forzati: le versioni locali devono restare stabili finche l'utente non richiede l'update.
- Se una modifica cambia comportamento o architettura, aggiornare la documentazione nella stessa fase.

## Aree Sensibili

- `app/js/app.js`: molto grande, contiene UI state, rendering, eventi e workaround mobile.
- `app/js/storage.js`: rischio dati; ogni modifica deve rispettare backup/import.
- `Storage.KEY`: se si pubblica una versione dev sullo stesso dominio della stabile, non deve usare la stessa chiave dati della stabile.
- Configurazione runtime minima: `app/js/config.js`, caricato prima di `storage.js`.
- Workflow Pages: `.github/workflows/pages.yml` assembla stabile da `main` e dev da `codex/refactor`.
- `app/js/parser.js`: impatta l'inserimento rapido, flusso principale dell'app.
- Gestione back button, modali, filtri, tastiera mobile e scroll: molte parti sono state sistemate dopo bug concreti.

## Stile di Lavoro Consigliato

- Prima capire il comportamento attuale, poi intervenire.
- Preferire modifiche piccole, verificabili e documentate.
- Separare refactor da nuove feature quando possibile.
- Durante il refactor, preservare l'esperienza utente esistente salvo bug dichiarati.
- Tenere distinta la versione stabile dalla versione dev anche a livello di nome app, icona e storage quando vengono pubblicate fianco a fianco.
