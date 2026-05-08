# SpesaTracker

SpesaTracker e una web app personale per tracciare le spese quotidiane in modo semplice, privato e locale.

L'app nasce per essere veloce da usare, soprattutto da smartphone Android: si apre, si scrive una spesa in linguaggio naturale, e il dato resta nel browser dell'utente. Non richiede backend, account o servizi esterni per salvare le spese.

## Principi

- **Local-first e privata**: i dati sono salvati in `localStorage`, senza server applicativo.
- **Semplice da mantenere**: HTML, CSS e JavaScript vanilla, con deploy statico.
- **Mobile-first pragmatico**: Android e uso quotidiano personale sono la priorita; iOS e browser desktop vanno mantenuti dignitosi senza complicare troppo il progetto.
- **Backup esplicito**: l'app supporta import/export JSON e CSV; ogni modifica ai dati deve rispettare questa possibilita.
- **Aggiornamenti controllati**: quando l'app sara installabile/offline, dovra restare stabile e aggiornarsi solo su richiesta esplicita dell'utente.
- **Refactor senza overengineering**: il progetto resta personale, quindi le astrazioni devono servire davvero.

## Stato Attuale

L'app e gia utilizzabile per l'uso quotidiano e include:

- inserimento rapido delle spese tramite parser testuale;
- categorie e metodi di pagamento predefiniti;
- tag, note e modifica delle spese;
- filtri per ricerca, periodo, importo, categoria e metodo;
- timeline con riepilogo giornaliero/settimanale/mensile;
- statistiche con grafici Chart.js;
- import/export JSON e CSV;
- tema chiaro/scuro/automatico;
- manifest web app per installazione base.

Non e ancora una PWA completamente offline: Chart.js viene caricato da CDN e non esiste ancora un service worker. Anche la gestione versioni/aggiornamenti e ancora da progettare.

## Struttura

```text
.
+-- README.md
+-- docs/
|   +-- AGENT_NOTES.md
|   +-- CODE_REVIEW.md
|   +-- CURRENT_STATE.md
|   +-- DEPLOYMENT_STRATEGY.md
|   +-- DEVELOPMENT_GUIDE.md
|   +-- ROADMAP.md
+-- note/
|   +-- note_di_progetto.txt
+-- spesa-tracker/
    +-- index.html
    +-- manifest.json
    +-- css/style.css
    +-- js/
        +-- app.js
        +-- categories.js
        +-- config.js
        +-- parser.js
        +-- storage.js
```

## Documentazione

- [Stato corrente](docs/CURRENT_STATE.md): cosa e implementato oggi e come funziona.
- [Review tecnica](docs/CODE_REVIEW.md): problemi, rischi e priorita del refactor.
- [Strategia stabile/dev](docs/DEPLOYMENT_STRATEGY.md): come separare versione stabile e versione di test.
- [Guida sviluppo](docs/DEVELOPMENT_GUIDE.md): regole pratiche per refactor e nuove feature.
- [Roadmap](docs/ROADMAP.md): backlog ordinato a partire dagli appunti.
- [Note per agenti](docs/AGENT_NOTES.md): memoria operativa per Codex e altri assistenti.
- [Appunti raw](note/note_di_progetto.txt): fonte grezza e storica delle idee.

## Sviluppo Locale

L'app non richiede build. Si puo aprire direttamente `spesa-tracker/index.html` oppure servire la cartella con un server statico.

Esempio:

```powershell
cd spesa-tracker
python -m http.server 8000
```

Poi aprire `http://localhost:8000`.

## Deploy

Il progetto e pensato per GitHub Pages: la cartella `spesa-tracker/` contiene tutti gli asset necessari per il deploy statico.

Durante il refactor, il deploy previsto separa stabile e sviluppo:

- `/` e `/stable/`: versione stabile da `main`;
- `/dev/`: versione di sviluppo da `codex/refactor`, con storage locale separato.

Prima di modificare la logica dei dati, leggere `docs/CURRENT_STATE.md` e `docs/DEVELOPMENT_GUIDE.md`.
