# Roadmap

Questa roadmap ordina gli appunti grezzi in `note/note_di_progetto.txt`. Non sostituisce la fonte raw: serve per decidere cosa fare e in che fase.

## Refactor e Stabilita

Stato della fase iniziale:

- Completato: canale stabile/dev sicuro con `/` e `/stable/` da `main`, `/dev/` da `codex/refactor` e storage key separata per la dev.

Priorita della fase attuale:

- Usare `docs/CODE_REVIEW.md` come mappa iniziale dei rischi tecnici.
- Affrontare prima guardrail dati, import/export e salvataggi.
- Aggiungere test minimi su parser, storage, filtri e aggregazioni.
- Pulire la codebase senza cambiare comportamento percepito.
- Separare progressivamente logica dati, rendering e gestione UI oggi concentrate in `app.js`.
- Rendere piu leggibili filtri, modali, navigazione e statistiche.
- Mantenere documentazione aggiornata a ogni cambiamento strutturale.
- Mantenere `AGENTS.md` in root come riferimento operativo per gli assistenti.

## Repository e Canali

Stato: completato.

- Repository rinominata in `tracker-spese`; mantenere allineati URL GitHub Pages, documentazione e riferimenti interni.
- Versione stabile e dev distinguibili con storage key separata, manifest separati e cartelle icone separate.
- Stabile: `Where's My Money?` / `WMM`, manifest `app/manifest.json`, icone `app/icons/stable/`.
- Dev: `Where's My Bug?` / `WMB`, manifest `app/manifest.dev.json`, icone `app/icons/dev/`.
- Il workflow applica il branding dev solo nell'artefatto `/dev/`, cosi una promozione dev -> stabile non porta automaticamente nome e icona dev nella stabile.

## Bug e Miglioramenti Vicini

Elementi emersi dagli appunti come utili nel breve periodo:

- Fix animazione quando si fa swipe indietro dal lato sinistro dello schermo su alcuni Android.
- Su PC, permettere lo scroll quando il pannello filtri e completamente aperto.
- Su PC, confermare la modifica alla spesa con Invio.
- Aggiornare live il riepilogo nella tendina quando si aggiungono o rimuovono spese.
- Sistemare animazione e posizione della barra di inserimento durante apertura/chiusura tastiera.
- Nascondere la barra di inserimento quando il pannello filtri e completamente aperto.
- Rendere il pannello filtri scrollabile anche quando non completamente aperto.
- Separare lo scroll tra timeline, statistiche e impostazioni: lo scroll di una pagina non deve trascinare le altre, e il cambio pagina deve riportare in alto la vista attiva quando appropriato.
- Rivedere la gestione di chiusura di pannelli, modali e history quando filtri parzialmente aperti e modifica spesa interagiscono tra loro.
- Evitare che l'app si chiuda completamente quando viene chiusa con indietro, mantenendola nei recenti dove possibile.

## Dati, Privacy e Import/Export

Priorita legate ai dati locali:

- Eseguire una review privacy esplicita: quali dati restano nel browser, quali asset o librerie vengono caricati da rete e quali rischi esistono in caso di device condiviso o backup esportati.
- Valutare se e quando introdurre cifratura locale dei dati, chiarendo impatto su recupero dati, backup e usabilita quotidiana.
- Riflettere su strutture dati alternative prima di estendere molto il modello attuale, soprattutto per categorie personalizzabili, tag, cestino, ricorrenze e versioni schema.
- Per import JSON, CSV e futuri TSV/Markdown, offrire scelta esplicita tra aggiungere ai dati esistenti e sostituire i dati esistenti.
- Definire una policy per id duplicati in import aggiuntivi: rigenerare id in conflitto o normalizzare con riepilogo prima del commit.
- Unificare import/export in un flusso UI unico con scelta successiva tra formati disponibili, invece di avere pulsanti separati per ogni formato.
- Aggiungere formati copia/esportazione rapida per spese selezionate o filtrate: JSON, CSV/TSV e tabella Markdown.

## Offline e Installazione

Obiettivo: app scaricabile/installabile, funzionante offline e stabile nel tempo.

Passi probabili:

- Aggiungere service worker.
- Rendere locale Chart.js o sostituire il caricamento CDN con asset vendorizzato.
- Definire strategia cache per HTML, CSS, JS, manifest e icone.
- Verificare comportamento su GitHub Pages.
- Migliorare icone, favicon e manifest.

## Versioni e Aggiornamenti Controllati

Obiettivo: una volta scaricata/installata in locale, l'app deve restare stabile e aggiornarsi solo quando l'utente lo richiede.

Da progettare:

- Lista di versioni disponibili pubblicata dal maintainer.
- Ultima versione consigliata di default, ma non installata automaticamente.
- Possibilita di mantenere disponibili versioni vecchie stabili e affidabili mentre si lavora su versioni nuove.
- Meccanismo interno all'app per controllare, scegliere e applicare un aggiornamento.
- Strategia per avere piu versioni disponibili contemporaneamente su GitHub Pages o altro hosting statico.
- Gestione compatibilita dati tra versioni, soprattutto se cambia lo schema in `localStorage`.
- Comunicazione chiara all'utente prima di aggiornamenti che possono cambiare dati o comportamento.

## Filtri e Ricerca

Idee future:

- Pannello filtri regolabile e bloccabile con lucchetto, da definire meglio.
- Apertura/chiusura pannello filtri tramite swipe su barra inferiore e header.
- Date range picker custom, simile a prenotazione hotel/voli.
- Suggerimenti nella barra ricerca per categorie, metodi pagamento e tag.
- Tag cercabili solo con prefisso `#`, per esempio `#viaggio`.
- Filtri negativi con toggle a tre stati: includi, escludi, neutro.
- Filtri tag con selezione di tutti i tag, spese senza tag e ricerca tag.
- Filtri preimpostati salvabili da futura sezione personalizzazione.

## Categorie, Metodi e Personalizzazione

Da sviluppare dopo il refactor:

- Ordinamento alfabetico robusto di categorie e metodi, non dipendente dall'ordine nel codice.
- Tab o sezione personalizzazione.
- Customizzazione categorie: nome, colore, keyword, attiva/non attiva, aggiunta e rimozione.
- Colori stabili per categoria.
- Sostituzione progressiva delle emoji con icone coerenti.
- Miglioramento estetico generale senza perdere velocita d'uso.

## Cancellazione e Gestione Spese

Funzioni previste:

- Cestino con spese cancellate e ripristinabili.
- Swipe su spesa per eliminazione rapida.
- Pressione lunga su spesa per entrare in modalita selezione.
- Azioni bulk: elimina, seleziona tutte.
- In modalita selezione, i filtri attivi restano validi: "seleziona tutte" agisce solo sulle spese visibili/filtrate.

## Statistiche e Grafici

Miglioramenti desiderati:

- Grafico spese nel tempo colorato per categorie.
- Barre divise per categoria quando piu spese contribuiscono allo stesso intervallo.
- Soglia indicativa del 10% per mostrare contributi categoria dentro una barra.
- Grafico a torta con label principali vicine e percentuali minori in elenco sotto.
- Linee verticali tratteggiate per separare settimane, mesi o anni in base all'aggregazione.
- Eventuale colore UI collegato allo sforamento budget, idea a bassa priorita.

## Funzioni Future

Idee piu grandi o da chiarire:

- Spese ricorrenti inserite automaticamente alla data prevista.
- Backup schedulato, con strategia da definire per non accumulare file inutili.
- Accrediti oltre alle spese.
- Swipe orizzontale tra timeline, statistiche e impostazioni.
- Foto scontrini, OCR e parsing automatico.
- Chatbot per interrogare i dati gia filtrati.

## Bassa Priorita Nota

- Problemi specifici iOS, salvo bug bloccanti.
- Browser mobile generico.
- Rifiniture desktop non essenziali.
- Feature sperimentali come OCR e chatbot.
