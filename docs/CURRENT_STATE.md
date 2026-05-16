# Stato Corrente

Questo documento descrive lo stato reale della codebase al momento dell'avvio del refactor. Serve come riferimento tecnico leggero: abbastanza dettagliato da orientare le modifiche, non cosi formale da diventare un peso.

## Architettura

Where's My Money? e una web app statica, senza build system e senza framework.

- `app/index.html` definisce la struttura dell'app, carica Chart.js da CDN e include gli script locali.
- `app/css/style.css` contiene tutto lo stile, incluse variabili tema, layout mobile, modali, filtri, timeline, statistiche e impostazioni.
- `app/js/config.js` contiene configurazione runtime minima, inclusa la chiave `localStorage`.
- `app/js/categories.js` contiene categorie e metodi di pagamento statici.
- `app/js/parser.js` interpreta l'input testuale e crea una spesa.
- `app/js/storage.js` gestisce persistenza, import/export e utility dati.
- `app/js/app.js` contiene lo stato UI e quasi tutta la logica applicativa.

La struttura attuale e intenzionalmente semplice ma `app.js` e diventato il centro di molte responsabilita: navigazione, filtri, input, modal, tag, statistiche, import/export e gestione mobile.

Per la mappa dettagliata dei rischi tecnici e dell'ordine consigliato del refactor, vedere `docs/CODE_REVIEW.md`.

## Dati Locali

I dati sono salvati in `localStorage` con chiave `spesa-tracker-data`.

La chiave puo essere sovrascritta da `window.SPESA_TRACKER_CONFIG.storageKey`. Questo serve per pubblicare una versione dev sullo stesso dominio GitHub Pages senza condividere i dati reali della stabile.

La struttura principale e:

```js
{
  schemaVersion: 1,
  spese: [],
  impostazioni: {
    tema: "auto",
    valuta: "EUR",
    simbolo: "€",
    ultimoBackup: null
  }
}
```

`schemaVersion` e stato introdotto all'avvio del refactor dati. I backup senza `schemaVersion` vengono trattati come schema `1`, cosi i backup esistenti restano importabili.

Una spesa contiene normalmente:

- `id`: identificatore generato localmente;
- `importo`: numero con due decimali;
- `descrizione`: testo principale;
- `categoria`: id categoria;
- `metodo`: id metodo di pagamento;
- `data`: data ISO;
- `tags`: array di tag senza `#`;
- `nota`: testo libero;
- `creatoIl` e `modificatoIl`: date ISO gestite dallo storage.

`storage.js` normalizza le spese lette o importate prima di salvarle: importi numerici, date valide, tag senza `#`, impostazioni con fallback e id duplicati rigenerati. Le operazioni di scrittura ritornano risultati espliciti `{ success, ... }`; la UI mostra successo solo se il commit in `localStorage` e riuscito.

Se il JSON salvato in `localStorage` e corrotto o incompatibile, i nuovi salvataggi vengono bloccati per evitare sovrascritture silenziose. In impostazioni compare un guardrail per esportare i dati grezzi prima di intervenire.

JSON e il formato di backup completo dello stato oggi esistente, incluse le `impostazioni`. CSV e pensato per interoperabilita con fogli di calcolo; ora esporta anche `id`, `tags`, `creatoIl` e `modificatoIl`, pur restando meno espressivo del JSON per futuri dati complessi.

## Funzioni Implementate

### Inserimento spese

L'utente inserisce testo libero nella barra inferiore. Il parser estrae importo, tag, metodo di pagamento e categoria probabile. Se la descrizione resta vuota, viene usata `Spesa`.

Sono supportati importi in forme come `1.50`, `1,50`, `€1.50`, `1.50€` e `1.50 euro`.

La dettatura vocale e supportata quando il browser espone `SpeechRecognition` o `webkitSpeechRecognition`.

Alcuni campi monoriga sono implementati come `textarea` per evitare, su mobile, la sezione invasiva di suggerimenti/autofill della tastiera.

### Parser e classificazione

Il parser:

- cerca il primo importo valido;
- rimuove importo e tag dalla descrizione;
- rileva il metodo di pagamento tramite keyword;
- rileva la categoria cercando keyword nelle categorie statiche;
- sceglie la categoria con keyword trovata prima nel testo;
- usa `carta` come metodo di default e `altro` come categoria di fallback.

### Timeline

La timeline mostra le spese raggruppate per giorno, ordinate dalla piu recente. Il riepilogo mostra totali per oggi, settimana corrente e mese corrente. Con filtri attivi mostra anche un riepilogo filtrato.

Le spese sono apribili in modifica tramite click/tap sulla card.

### Filtri

I filtri sono condivisi tra timeline e statistiche:

- ricerca testuale su descrizione, nota e tag;
- range data;
- importo minimo/massimo con dual slider;
- categorie;
- metodi di pagamento.

Il pannello filtri ha una sezione base e una sezione avanzata. Il badge nel pulsante filtri conta i filtri attivi.

### Modifica spesa

La modale permette di modificare importo, descrizione, data, ora, categoria, metodo, tag e nota. Include conferma di eliminazione.

Categoria, metodo e tag usano dropdown ricercabili custom. I tag suggeriscono valori gia usati, con preferenza per ultimo uso e frequenza.

### Navigazione e mobile

La navigazione principale e composta da:

- Timeline;
- Statistiche;
- Impostazioni.

`app.js` gestisce diversi casi legati al tasto indietro del telefono:

- chiusura conferma eliminazione;
- chiusura o pulizia interazioni della modale;
- uscita dal campo ricerca filtri;
- uscita dalla barra inserimento;
- chiusura filtri avanzati;
- chiusura pannello filtri;
- ritorno alla timeline dalle altre pagine.

Ci sono anche workaround per tastiera mobile, `visualViewport`, input sticky e blocco scroll in modale.

### Statistiche

Le statistiche usano Chart.js e includono:

- periodo settimana, mese, anno o custom;
- totale, numero spese e media giornaliera;
- grafico a torta per categoria;
- grafico a barre con aggregazione giornaliera, settimanale o mensile;
- dettaglio categorie;
- top 5 spese.

I filtri non-data vengono applicati anche alle statistiche.

Oggi la pagina statistiche e di sola lettura: da li non si apre direttamente la modale di modifica di una spesa.

### Impostazioni

La pagina impostazioni include:

- tema chiaro, scuro o automatico;
- export con scelta formato JSON o CSV;
- import JSON e CSV con preview e scelta esplicita tra aggiungere e sostituire;
- snapshot locale automatico prima di sostituire o cancellare i dati;
- esportazione dei dati grezzi quando lo storage locale non e leggibile;
- informazioni su numero spese, periodo coperto e spazio usato;
- cancellazione completa dei dati con conferma.

Negli import aggiuntivi, gli id duplicati o mancanti vengono rigenerati e riepilogati. Negli import JSON in modalita aggiungi, le impostazioni del backup non sovrascrivono quelle correnti; in modalita sostituisci vengono invece importate insieme alle spese.

La roadmap prevede anche che eventuali personalizzazioni future, oltre alle impostazioni gia presenti, entrino nello stesso perimetro di backup/import per facilitare cambio dispositivo e ripristino completo.

Il toggle tema nell'header e pensato come cambio temporaneo; la preferenza stabile del tema si modifica dalle impostazioni.

## Limiti Noti

- Non c'e ancora un service worker: l'app non e pienamente offline.
- Chart.js viene caricato da CDN, quindi le statistiche dipendono dalla rete al primo caricamento.
- Non esiste ancora un sistema di versioni installabili in parallelo o aggiornamenti controllati dall'utente.
- `app.js` e molto grande e accoppia stato, rendering, eventi e workaround mobile.
- Categorie e metodi sono statici nel codice, non personalizzabili dall'app.
- Le categorie non hanno ancora icone o immagini personalizzabili dall'utente, ne un colore visivo mostrato direttamente sulle spese.
- Non esiste ancora una modalita selezione con evidenza visiva dedicata e azioni bulk sulle spese.
- Non esiste ancora supporto multi-account: tutto vive in un unico contenitore dati locale.
- Nella pagina statistiche esiste almeno un problema noto di resa dell'empty state: il tip iniziale puo risultare coperto dall'effetto di trasparenza quando non ci sono spese.
- Il CSV preserva i campi principali attuali, inclusi tag e timestamp, ma resta meno adatto del JSON come backup completo per futuri dati complessi.
- La compatibilita iOS ha problemi UI noti ed e priorita bassa rispetto ad Android.
- Il browser desktop e usabile ma non e ancora rifinito quanto l'esperienza mobile.
- Esiste un primo test runner Node (`node tests/run-tests.js`) per storage e parser; mancano ancora test su filtri, aggregazioni statistiche e UI mobile.
