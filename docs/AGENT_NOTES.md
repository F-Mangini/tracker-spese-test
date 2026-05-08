# Note per Codex e Assistenti

Questo progetto e personale ed e mantenuto da una sola persona. Le soluzioni devono aiutare il maintainer a lavorare meglio, non introdurre processi o architetture da team grande.

## Contesto

- Nome app: SpesaTracker.
- Scopo: tracker spese semplice, privato, locale.
- Uso reale: quotidiano su Android.
- Deploy: GitHub Pages / hosting statico.
- Backend: assente.
- Persistenza: `localStorage`.
- Stack: HTML, CSS, JavaScript vanilla, Chart.js da CDN.
- Lingua documentazione e UI: italiano.
- Obiettivo distribuzione: app installabile/offline stabile, con aggiornamenti scelti dall'utente da una lista di versioni pubblicate dal maintainer.

## Priorita Operative

1. Non rompere l'uso quotidiano.
2. Non mettere a rischio i dati locali.
3. Mantenere l'app semplice e comprensibile.
4. Migliorare la struttura prima di aggiungere grandi feature.
5. Trattare Android come piattaforma primaria.

## Prima di Modificare Codice

Leggere, nell'ordine:

1. `README.md`;
2. `docs/CURRENT_STATE.md`;
3. `docs/CODE_REVIEW.md`;
4. `docs/DEVELOPMENT_GUIDE.md`;
5. `docs/ROADMAP.md`;
6. `note/note_di_progetto.txt` se si lavora su backlog o dettagli storici.

Non considerare `note/note_di_progetto.txt` come specifica finale: e una raccolta raw di appunti. La roadmap curata decide priorita e raggruppamenti, ma gli appunti possono contenere dettagli utili non ancora formalizzati.

## Vincoli

- Evitare framework e build step finche non sono chiaramente necessari.
- Evitare refactor larghi e simultanei.
- Prima dei refactor larghi, affrontare o almeno considerare i rischi in `docs/CODE_REVIEW.md`.
- Non cambiare schema dati senza fallback per vecchi dati.
- Non rimuovere workaround mobile senza capire quale bug risolvevano.
- Non sostituire i `textarea` usati come input/dropdown senza verificare l'effetto sui suggerimenti/autofill della tastiera mobile.
- Non rendere persistente il toggle tema dell'header: e intenzionalmente temporaneo; la persistenza sta nelle impostazioni.
- Non introdurre dipendenze che impediscano il deploy statico semplice.
- Non progettare aggiornamenti automatici forzati: le versioni locali devono restare stabili finche l'utente non richiede l'update.
- Se una modifica cambia comportamento o architettura, aggiornare la documentazione nella stessa fase.

## Aree Sensibili

- `spesa-tracker/js/app.js`: molto grande, contiene UI state, rendering, eventi e workaround mobile.
- `spesa-tracker/js/storage.js`: rischio dati; ogni modifica deve rispettare backup/import.
- `spesa-tracker/js/parser.js`: impatta l'inserimento rapido, flusso principale dell'app.
- Gestione back button, modali, filtri, tastiera mobile e scroll: molte parti sono state sistemate dopo bug concreti.

## Stile di Lavoro Consigliato

- Prima capire il comportamento attuale, poi intervenire.
- Preferire modifiche piccole, verificabili e documentate.
- Separare refactor da nuove feature quando possibile.
- Durante il refactor, preservare l'esperienza utente esistente salvo bug dichiarati.
- Quando una scelta non e deducibile dalla codebase o dagli appunti, chiedere al maintainer invece di inventare una policy complessa.
