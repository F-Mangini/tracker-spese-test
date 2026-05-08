# Code Review Tecnica

Review eseguita il 2026-05-08 su `spesa-tracker/`, con lettura statica completa dei file principali e controllo sintattico tramite `node --check`.

Obiettivo: capire cosa rende rischioso il refactor e ordinare i problemi per gravita e difficolta. Questa non e una lista di task obbligatori immediati: e una mappa dei rischi.

## Scala

**Gravita**

- **Estrema**: rischio concreto di perdita dati, app non recuperabile, blocco strutturale importante.
- **Alta**: bug o struttura che puo rompere flussi centrali o rendere rischioso il refactor.
- **Media**: problema reale ma circoscritto, oppure debito tecnico che peggiora con la crescita.
- **Bassa**: pulizia, incoerenza minore o miglioramento ergonomico.

**Difficolta**

- **Estrema**: richiede ripensamento architetturale profondo o migrazione complessa.
- **Alta**: richiede piu passaggi coordinati e test manuali accurati.
- **Media**: richiede attenzione ma puo essere isolato.
- **Bassa**: fix locale o cleanup semplice.

## Sintesi Esecutiva

L'app e funzionante e coerente con il suo obiettivo originario: una web app locale, semplice e veloce. Il problema principale non e che il codice sia "sbagliato", ma che molte decisioni nate come fix rapidi ora sono concentrate in un unico oggetto globale.

Priorita consigliata:

1. Mettere guardrail su dati, import/export e salvataggi.
2. Aggiungere test minimi per parser, storage e filtri prima di refactor larghi.
3. Spezzare `app.js` in aree funzionali senza cambiare UX.
4. Stabilizzare history/back button e gestione modali/tastiera.
5. Poi affrontare PWA/offline/versioni controllate.

Non sono stati trovati errori di sintassi JavaScript. Non ci sono backend, chiamate API dati o evidente esfiltrazione di dati personali.

## Findings Principali

| ID | Problema | Gravita | Difficolta | Area |
| --- | --- | --- | --- | --- |
| CR-01 | Guardrail insufficienti su `localStorage`: dati corrotti o salvataggi falliti possono portare a perdita dati silenziosa | Estrema | Media | Dati |
| CR-02 | Import JSON troppo permissivo e potenzialmente distruttivo | Alta | Media | Dati |
| CR-03 | `app.js` e un monolite globale con troppe responsabilita | Alta | Alta | Architettura |
| CR-04 | Back button/history state fragile e distribuito in molti punti | Alta | Alta | Navigazione |
| CR-05 | Parser e modifica importo possono registrare importi sbagliati | Alta | Media | Core UX |
| CR-06 | Assenza di test automatici sui flussi critici | Alta | Media | Qualita |
| CR-07 | Offline/PWA/versioni controllate non hanno ancora fondamenta tecniche | Alta | Alta | Distribuzione |
| CR-08 | CSV fragile e lossy rispetto al modello dati reale | Media | Media | Import/export |
| CR-09 | Rendering HTML e sanitizzazione sono incoerenti | Media | Media | UI/sicurezza futura |
| CR-10 | Stato dati senza schema versionato o normalizzazione centralizzata | Media | Media | Dati |
| CR-11 | CSS molto accoppiato a layout mobile, z-index e workaround | Media | Alta | UI |
| CR-12 | Performance accettabile oggi, ma letture/render ripetuti non scalano bene | Media | Bassa | Performance |
| CR-13 | Categorie/metodi statici mescolano dati, euristiche e presentazione | Media | Media | Dominio |
| CR-14 | Manifest/PWA incompleti per installazione robusta | Media | Media | Distribuzione |
| CR-15 | Accessibilita e semantica da migliorare | Bassa | Media | UX |
| CR-16 | Cleanup minori: codice morto, variabili inutilizzate, stati visuali residui | Bassa | Bassa | Pulizia |

## Dettaglio Findings

### CR-01 - Guardrail insufficienti su `localStorage`

- **Gravita**: Estrema
- **Difficolta**: Media
- **File**: `spesa-tracker/js/storage.js:22`, `spesa-tracker/js/storage.js:37`, `spesa-tracker/js/storage.js:53`

Problema:

- Se `_load()` trova JSON corrotto, fa solo `console.error` e ritorna dati vuoti.
- Se subito dopo l'utente aggiunge/modifica/importa, `_save()` puo sovrascrivere il payload corrotto con una struttura vuota o parziale.
- `_save()` ritorna `false` in caso di errore, ma `addSpesa`, `updateSpesa`, `deleteSpesa`, `importJSON`, `importCSV` e `updateSettings` ignorano il risultato.
- La UI puo mostrare successo anche se il salvataggio e fallito.

Perche conta:

Questa e l'area piu delicata del progetto: l'app e privata/local-first, quindi il dato nel browser e il prodotto. Prima del refactor serve una strategia di recovery.

Direzione di fix:

- Introdurre risultati espliciti dalle operazioni storage.
- Non mostrare successo se `_save()` fallisce.
- In caso di JSON corrotto, evitare sovrascritture automatiche e offrire esportazione/diagnostica del raw.
- Centralizzare backup pre-import e possibilmente snapshot locale prima di operazioni distruttive.

### CR-02 - Import JSON troppo permissivo

- **Gravita**: Alta
- **Difficolta**: Media
- **File**: `spesa-tracker/js/storage.js:109`, `spesa-tracker/js/app.js:2699`

Problema:

- `importJSON()` valida solo che `data.spese` esista e sia un array.
- Non valida tipi, date, importi, id duplicati, campi mancanti, `tags`, `impostazioni`, versione schema.
- Un JSON con `importo` stringa puo arrivare fino a rendering come `s.importo.toFixed(2)`, causando errore runtime.
- Il JSON sostituisce i dati esistenti dopo conferma, ma senza normalizzazione o dry-run.

Direzione di fix:

- Aggiungere validazione e normalizzazione completa.
- Separare `parse/validate` da `commit`.
- Mostrare un riepilogo prima della sostituzione.
- Aggiungere `schemaVersion` nei backup.

### CR-03 - `app.js` monolitico

- **Gravita**: Alta
- **Difficolta**: Alta
- **File**: `spesa-tracker/js/app.js:14`

Problema:

`App` contiene quasi tutto: tema, navigazione, filtri, slider, input, voce, timeline, modale, dropdown, tag, conferme, statistiche, grafici, impostazioni, toast e helper. Il file supera le 2800 righe.

Conseguenze:

- Ogni modifica rischia regressioni laterali.
- Stato UI e dominio sono mescolati.
- Le funzioni sono difficili da testare perche leggono/scrivono DOM e `localStorage`.
- I workaround mobile non sono isolati e diventano difficili da rimuovere.

Direzione di fix:

- Estrarre prima funzioni pure: date, filtri, aggregazioni statistiche, parser helper.
- Poi estrarre moduli UI: timeline, filters, modal, settings, stats.
- Tenere un orchestratore centrale piccolo, senza riscrivere tutta l'app in una volta.

### CR-04 - Back button/history state fragile

- **Gravita**: Alta
- **Difficolta**: Alta
- **File**: `spesa-tracker/js/app.js:120`, `spesa-tracker/js/app.js:192`, `spesa-tracker/js/app.js:261`, `spesa-tracker/js/app.js:816`, `spesa-tracker/js/app.js:1190`, `spesa-tracker/js/app.js:1386`, `spesa-tracker/js/app.js:1899`

Problema:

La history e manipolata da molti punti: navigazione pagina, filtri, ricerca, input spesa, modale, dropdown, conferme. Ci sono flag come `_suppressNextPopstate`, `_modalInteractionActive`, `_filterSearchActive`, `_expenseInputActive`, `advancedFiltersOpen`.

Esempi concreti:

- `toggleAdvancedFilters()` fa `pushState` quando apre, ma quando chiude da bottone non consuma quella history entry.
- `closeModal()` puo fare `history.go(-2)` se crede che esista uno stato interazione.
- Blur di input e ricerca chiamano `history.back()` con timeout.
- Il singolo listener `popstate` deve interpretare molti stati impliciti.

Perche conta:

Questa e probabilmente la zona piu fragile lato mobile. Molti bug gia risolti negli appunti riguardano proprio back button, tastiera, modali e pannelli.

Direzione di fix:

- Creare un piccolo "UI stack manager" per stati sovrapposti: pagina, pannello filtri, ricerca, input, modale, dropdown, conferma.
- Definire regola unica: ogni `pushState` deve avere una chiusura simmetrica.
- Aggiungere checklist manuale Android per ogni modifica.

### CR-05 - Parser e modifica importo possono registrare importi sbagliati

- **Gravita**: Alta
- **Difficolta**: Media
- **File**: `spesa-tracker/js/parser.js:16`, `spesa-tracker/js/parser.js:21`, `spesa-tracker/js/app.js:1929`

Problemi:

- Il parser prende il primo intero nel testo. Esempi verificati:
  - `pizza 4 formaggi 8` diventa importo `4`, descrizione `Pizza formaggi 8`.
  - `pizza 4 formaggi 8 euro` diventa ancora importo `4`, perche manca pattern per interi seguiti da `euro`.
  - `2 caffe 3 euro` diventa importo `2`.
- In modifica spesa, `parseFloat('1,50')` produce `1`, non `1.5`.

Direzione di fix:

- Estrarre un parser importo testabile.
- Supportare interi con `euro`, simbolo euro e preferenza per importi a fine frase.
- Normalizzare virgola/punto anche in `saveEdit()`.
- Aggiungere test con esempi reali.

### CR-06 - Assenza di test automatici

- **Gravita**: Alta
- **Difficolta**: Media
- **File**: repository

Problema:

Non c'e test harness. Per ora il progetto e piccolo, ma il refactor tocchera esattamente le parti piu fragili: dati, parser, filtri, history e statistiche.

Direzione di fix:

- Aggiungere test leggeri senza cambiare stack in modo pesante.
- Priorita test:
  - parser importi/tag/metodi/categorie;
  - storage load/save/import/export con localStorage mock;
  - filtri;
  - aggregazioni statistiche giornaliere/settimanali/mensili.
- Rimandare test E2E browser finche non sono chiari i flussi piu stabili.

### CR-07 - Offline/PWA/versioni controllate non ancora fondate

- **Gravita**: Alta
- **Difficolta**: Alta
- **File**: `spesa-tracker/index.html:212`, `spesa-tracker/manifest.json:1`

Problema:

- Chart.js arriva da CDN.
- Non esiste service worker.
- Il manifest ha un'icona data URI minimale, non set completo 192/512.
- Non esiste una strategia per aggiornamenti controllati dall'utente o versioni parallele.

Direzione di fix:

- Prima progettare policy di versionamento e compatibilita dati.
- Poi aggiungere service worker con cache versionata.
- Valutare manifest release statico pubblicato dal maintainer.
- Evitare aggiornamenti automatici silenziosi se possono rompere dati o UX.

### CR-08 - CSV fragile e lossy

- **Gravita**: Media
- **Difficolta**: Media
- **File**: `spesa-tracker/js/storage.js:90`, `spesa-tracker/js/storage.js:120`, `spesa-tracker/js/storage.js:159`

Problema:

- Export CSV non include `id`, `tags`, `creatoIl`, `modificatoIl`.
- Import CSV assegna sempre `tags: []`.
- Parser CSV custom non gestisce pienamente casi CSV complessi, come newline in campi quotati.
- `parseFloat(parts[2])` non gestisce importi con virgola decimale.

Direzione di fix:

- Definire CSV come formato lossy esplicito oppure estenderlo.
- Usare una funzione CSV piu robusta o almeno testare quote, virgole, righe vuote e decimali italiani.
- Mantenere JSON come backup completo.

### CR-09 - Rendering HTML e sanitizzazione incoerenti

- **Gravita**: Media
- **Difficolta**: Media
- **File**: `spesa-tracker/js/app.js:293`, `spesa-tracker/js/app.js:1001`, `spesa-tracker/js/app.js:1027`, `spesa-tracker/js/app.js:1483`, `spesa-tracker/js/app.js:1969`, `spesa-tracker/js/app.js:2190`

Problema:

La UI usa molto `innerHTML`. Alcuni campi utente sono escapati con `esc()`, altri template oggi sono sicuri solo perche i dati arrivano da liste statiche o messaggi interni.

Rischio:

Quando categorie, metodi, preset o messaggi diventeranno personalizzabili, sara facile inserire un campo non escapato.

Direzione di fix:

- Rendere esplicite le funzioni di rendering sicure.
- Evitare `innerHTML` per messaggi dinamici o usare un helper unico.
- `showConfirm()` dovrebbe distinguere messaggio testuale da markup controllato.

### CR-10 - Manca schema dati versionato

- **Gravita**: Media
- **Difficolta**: Media
- **File**: `spesa-tracker/js/storage.js:8`, `spesa-tracker/js/storage.js:26`

Problema:

Lo storage fa solo fallback minimo per `spese` e `impostazioni`. Non esistono `schemaVersion`, migrazioni, normalizzazione dei record o compatibilita dichiarata.

Perche conta:

La roadmap prevede cestino, ricorrenti, accrediti, categorie custom, colori categoria, filtri salvati e versioni controllate. Tutto questo richiede evoluzione dello schema.

Direzione di fix:

- Aggiungere `schemaVersion`.
- Normalizzare ogni spesa letta.
- Introdurre migrazioni idempotenti.
- Documentare compatibilita backup.

### CR-11 - CSS accoppiato a layout mobile e workaround

- **Gravita**: Media
- **Difficolta**: Alta
- **File**: `spesa-tracker/css/style.css:72`, `spesa-tracker/css/style.css:167`, `spesa-tracker/css/style.css:546`, `spesa-tracker/css/style.css:828`, `spesa-tracker/css/style.css:1030`, `spesa-tracker/css/style.css:1919`

Problema:

CSS e JS collaborano tramite fixed/sticky layout, z-index vicini, padding calcolati, classi globali (`no-scroll`, `expense-input-active`) e selettori moderni come `:has`.

Conseguenze:

- Piccole modifiche possono rompere scroll, tastiera o pannelli.
- PC e iOS possono divergere facilmente.
- Difficile capire quale regola risolve quale bug.

Direzione di fix:

- Documentare i contratti layout: header, main scrollabile, input bar, bottom nav, overlay.
- Ridurre classi globali e magic numbers.
- Creare test manuali visuali per Android, desktop e iOS quando disponibile.

### CR-12 - Letture/render ripetuti e prestazioni future

- **Gravita**: Media
- **Difficolta**: Bassa
- **File**: `spesa-tracker/js/app.js:481`, `spesa-tracker/js/app.js:500`, `spesa-tracker/js/app.js:939`

Problema:

Ogni cambio filtro puo:

- leggere `localStorage`;
- applicare filtri per aggiornare badge/info;
- renderizzare timeline o statistiche;
- riapplicare filtri.

Oggi va bene con pochi dati, ma puo diventare rumoroso quando le spese crescono.

Direzione di fix:

- Tenere una cache in memoria sincronizzata con storage.
- Calcolare una sola volta `allSpese` e `filtered` per ciclo render.
- Separare computazione da rendering DOM.

### CR-13 - Categorie/metodi troppo statici

- **Gravita**: Media
- **Difficolta**: Media
- **File**: `spesa-tracker/js/categories.js:5`, `spesa-tracker/js/parser.js:76`

Problema:

- Categorie, emoji, keyword e id sono tutti nello stesso array statico.
- L'ordine alfabetico dipende ancora dal codice.
- Alcune keyword sono duplicate o sovrapposte.
- L'id `produttività` contiene caratteri accentati: funziona in `localStorage`, ma e meno comodo come slug stabile per backup/migrazioni.
- La categoria viene scelta con `indexOf`, quindi match parziali e collisioni sono possibili.

Direzione di fix:

- Separare definizione dominio da presentazione.
- Usare id stabili, preferibilmente ASCII.
- Ordinare in UI, non nel dato sorgente.
- Introdurre priorita/score keyword testabile.

### CR-14 - Manifest/PWA incompleti

- **Gravita**: Media
- **Difficolta**: Media
- **File**: `spesa-tracker/manifest.json:12`, `spesa-tracker/index.html:10`

Problema:

Manifest minimale, icona data URI, nessun set icone PNG, nessun service worker, nessuna strategia cache.

Direzione di fix:

- Creare icone reali.
- Aggiungere service worker solo dopo avere deciso policy aggiornamenti.
- Verificare installazione su Android e comportamento GitHub Pages.

### CR-15 - Accessibilita e semantica migliorabili

- **Gravita**: Bassa
- **Difficolta**: Media
- **File**: `spesa-tracker/index.html:6`, `spesa-tracker/index.html:36`, `spesa-tracker/js/app.js:1477`

Problema:

- Viewport disabilita zoom (`user-scalable=no`).
- Alcuni controlli sono `textarea` usati come input/dropdown.
- I dropdown custom non espongono ruoli ARIA.
- Molti bottoni dinamici non hanno label descrittive.

Nota di progetto:

L'uso di `textarea` al posto di `input` in alcuni campi e intenzionale: serve a ridurre o evitare su mobile la sezione ingombrante di suggerimenti/autofill della tastiera, dove compaiono spesso mail, password e pagamenti. Non va quindi trattato come errore da correggere automaticamente, ma come tradeoff da preservare finche non esiste una soluzione migliore verificata su Android.

Direzione di fix:

- Non bloccare zoom se non strettamente necessario.
- Migliorare ruoli/label dei dropdown custom.
- Se si valuta `input` al posto di `textarea`, verificare prima che non riappaiano suggerimenti/autofill invasivi su mobile.

### CR-16 - Cleanup minori

- **Gravita**: Bassa
- **Difficolta**: Bassa
- **File**: `spesa-tracker/js/app.js:51`, `spesa-tracker/js/app.js:90`, `spesa-tracker/js/app.js:2181`, `spesa-tracker/css/style.css:1676`

Problemi:

- `_expenseScrollLockY` sembra inutilizzato.
- `hasNonDateFilters` viene calcolato ma non usato.
- `.stats-filter-note` sembra CSS residuo.
- Il numero versione `v2.3.4` e hardcoded nella UI.
- `resetFilters()` non rimuove necessariamente lo stato visuale `date-picked`.

Nota di progetto:

Il toggle tema nell'header e intenzionalmente temporaneo: cambia il tema per la sessione/uso corrente senza salvare l'impostazione. Il cambio stabile deve restare nella pagina impostazioni, dove viene usato `Storage.updateSettings`.

Direzione di fix:

- Cleanup dopo i fix piu importanti.
- Collegare versione a una sorgente unica quando si progettano release/versioni.

## Ordine di Refactor Consigliato

### Fase 1 - Protezione dati

- Rendere `Storage` esplicito nei successi/fallimenti.
- Validare import JSON/CSV.
- Introdurre schema versionato e normalizzazione.
- Aggiungere test storage/parser.

### Fase 2 - Estrazione logica pura

- Estrarre filtri, date, aggregazioni statistiche e parsing importo.
- Coprire con test.
- Ridurre letture ripetute di `localStorage`.

### Fase 3 - UI stack e mobile behavior

- Disegnare un modello unico per pagina/pannello/modale/conferma/input attivo.
- Sostituire gradualmente push/back sparsi.
- Verificare ogni passaggio su Android.

### Fase 4 - Modularizzazione UI

- Spezzare `app.js` in moduli coerenti.
- Lasciare un orchestratore centrale piccolo.
- Non cambiare UX durante l'estrazione.

### Fase 5 - Offline e versioni

- Progettare manifest release e policy aggiornamenti.
- Rendere Chart.js locale.
- Introdurre service worker con cache versionata.
- Solo dopo, aggiungere UI aggiornamenti controllati.

## Checklist Manuale Minima

Da usare dopo modifiche a UI o storage:

- Inserire spesa con importo decimale punto e virgola.
- Inserire frasi ambigue con numeri multipli.
- Modificare importo usando virgola.
- Aprire/chiudere filtri base e avanzati.
- Usare back button con tastiera aperta, modale aperta, dropdown aperto e conferma aperta.
- Importare JSON valido.
- Provare import JSON malformato.
- Esportare JSON e reimportarlo.
- Aprire statistiche con e senza rete quando Chart.js verra reso locale/offline.
- Verificare Android come piattaforma primaria.
