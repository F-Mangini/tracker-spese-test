# Guida Sviluppo

Questa guida definisce come lavorare sul progetto durante il refactor e le feature future.

## Priorita

1. Preservare l'uso quotidiano su Android.
2. Proteggere i dati locali e mantenere import/export affidabili.
3. Rendere stabile ogni versione installata: aggiornamenti solo su richiesta esplicita dell'utente.
4. Rendere la codebase piu chiara senza introdurre complessita non necessaria.
5. Migliorare progressivamente browser desktop.
6. Sistemare iOS quando il costo e ragionevole, ma senza bloccare il resto del progetto.

## Principi di Refactor

- Mantenere il progetto statico e semplice finche possibile.
- Evitare framework, build system o dipendenze nuove senza un beneficio evidente.
- Preferire moduli piccoli e funzioni pure quando si estrae logica da `app.js`.
- Non cambiare schema dati senza prevedere compatibilita o migrazione leggera.
- Non rompere backup JSON esistenti.
- Non forzare aggiornamenti automatici quando l'app sara offline/installabile: una versione locale stabile deve restare stabile finche l'utente non sceglie di aggiornare.
- Ogni modifica UI mobile va verificata almeno su viewport stretta.
- Le soluzioni per tastiera, back button e scroll mobile vanno trattate con cautela: spesso sono workaround costruiti dopo bug reali.
- Non sostituire automaticamente i `textarea` monoriga con `input`: in diversi punti sono usati per evitare suggerimenti/autofill invasivi della tastiera mobile.
- Il toggle tema nell'header e temporaneo; il cambio persistente del tema appartiene alla pagina impostazioni.

## Versioni e Aggiornamenti

Obiettivo futuro: permettere al maintainer di pubblicare piu versioni disponibili allo stesso tempo, lasciando l'utente su una versione stabile finche non decide di aggiornare.

Principi da rispettare quando verra progettata questa parte:

- L'app installata/localizzata non deve aggiornarsi in modo silenzioso se questo puo cambiare il comportamento quotidiano.
- L'utente deve poter aprire una sezione dell'app, vedere una lista di versioni messe a disposizione dal maintainer e scegliere quale installare/attivare.
- La UI deve consigliare di default l'ultima versione disponibile, ma senza imporla.
- Le versioni vecchie considerate stabili devono poter restare disponibili mentre il maintainer lavora su versioni nuove.
- La strategia tecnica e ancora da definire: service worker, cache versionate, manifest di release, percorsi GitHub Pages separati o altra soluzione equivalente.
- Ogni scelta deve proteggere i dati locali e chiarire cosa succede se una versione nuova introduce cambiamenti allo schema dati.

## Promozione a Stabile

Durante il refactor, il lavoro ordinario avviene su `codex/refactor`. Quando la dev e stata provata e va resa stabile, promuoverla con un merge intenzionale in `main`.

Va bene portare tutto il branch dev su `main` quando tutte le modifiche contenute sono state validate e devono diventare quotidiane. In questo caso e preferibile un merge completo rispetto a copiare solo `app/`, perche documentazione, workflow, manifest e configurazione fanno parte del comportamento della release.

Se invece solo alcune modifiche sono pronte, usare cherry-pick o un branch dedicato di release, evitando di trascinare feature non ancora validate.

## Linee Guida per i Dati

`localStorage` e la sorgente principale. Prima di modificare `storage.js`, controllare:

- formato attuale di `spese`;
- comportamento di `importJSON`;
- comportamento di `exportJSON`;
- comportamento di `previewImportJSON`, `previewImportCSV`, `importCSV` ed `exportCSV`;
- impatto su dati gia presenti nel browser.

Dal refactor dati del 2026-05-16:

- lo schema corrente e `schemaVersion: 1`;
- le scritture storage devono restituire risultati espliciti e la UI deve controllare `success` prima di mostrare conferme positive;
- i dati letti o importati devono passare dalla normalizzazione centralizzata in `storage.js`;
- un JSON locale corrotto deve bloccare i nuovi salvataggi finche il maintainer non esporta o risolve il raw;
- le operazioni distruttive come import in sostituzione e cancellazione completa devono creare uno snapshot locale prima del commit;
- import JSON e CSV devono mantenere preview/validazione separata dal commit.

Se si aggiungono campi alle spese, devono avere fallback sensati quando assenti nei vecchi backup.

Se si modifica una categoria o un metodo di pagamento, considerare che le spese salvate usano gli `id`, non il nome visualizzato.

Se si introduce una sezione di personalizzazione, definire fin dall'inizio quali dati fanno parte del backup completo del dispositivo. Impostazioni e personalizzazioni non devono restare fuori dai flussi di export/import se servono a ricostruire l'esperienza reale dell'utente su un nuovo device.

Se in futuro vengono aggiunte icone, immagini o colori personalizzabili per categoria, documentare dove vivono quei riferimenti e come vengono serializzati nei backup. Evitare soluzioni che rompano il deploy statico o rendano fragile il ripristino locale.

## Linee Guida UI

- L'app deve restare rapida da usare con una mano.
- La barra di inserimento e la bottom nav sono elementi centrali dell'esperienza mobile.
- Modali, filtri e tastiera devono convivere senza scroll strani o chiusure impreviste.
- Su desktop e accettabile una UI semplice, ma non devono esserci blocchi evidenti come scroll impossibile o azioni da tastiera mancanti.
- Prima di sostituire emoji con icone, definire una strategia unica e coerente.

## Documentazione Durante le Modifiche

Aggiornare la documentazione quando cambia una di queste cose:

- schema dati o storage;
- comportamento di import/export;
- navigazione, back button, modali o filtri;
- nuove sezioni principali dell'app;
- nuove priorita o decisioni di roadmap;
- vincoli tecnici importanti.

Usare questi file come fonti:

- `README.md`: panoramica pubblica e istruzioni essenziali.
- `docs/CODE_REVIEW.md`: mappa dei rischi tecnici e ordine consigliato per il refactor.
- `docs/CURRENT_STATE.md`: stato tecnico implementato.
- `docs/DEPLOYMENT_STRATEGY.md`: separazione stabile/dev per testare il refactor senza rischiare l'uso quotidiano.
- `docs/ROADMAP.md`: priorita e idee future ordinate.
- `AGENTS.md`: contesto operativo per assistenti AI.
- `note/note_di_progetto.txt`: appunti grezzi, storici, non necessariamente ordinati.

`README.md` e `AGENTS.md` contengono la lista completa dei file documentali ufficiali. Se si aggiunge o rimuove documentazione, aggiornare entrambe le liste nello stesso intervento.

## Processo Consigliato

Per ogni modifica non banale:

1. Leggere il documento di stato corrente e gli appunti rilevanti.
2. Identificare il comportamento esistente da preservare.
3. Controllare `docs/CODE_REVIEW.md` per rischi collegati all'area toccata.
4. Fare una modifica piccola e verificabile.
5. Testare manualmente il flusso interessato.
6. Aggiornare documentazione e roadmap se il significato del progetto cambia.
7. Spiegare in chat cosa e stato cambiato, perche e quali test o verifiche sono stati eseguiti.

## Test

Il test runner leggero attuale non richiede dipendenze:

```powershell
node tests/run-tests.js
```

Copre i primi guardrail su storage, parser, filtri e aggregazioni statistiche giornaliere, settimanali e mensili. I prossimi test ad alto valore riguardano history/back button, modali, tastiera mobile e interazioni DOM complesse.
