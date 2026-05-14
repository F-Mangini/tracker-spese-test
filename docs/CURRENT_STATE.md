# Stato Corrente

Questo documento descrive lo stato reale della codebase al momento dell'avvio del refactor. Serve come riferimento tecnico leggero: abbastanza dettagliato da orientare le modifiche, non cosi formale da diventare un peso.

## Architettura

Where's My Money? e una web app statica, senza build system e senza framework.

- `spesa-tracker/index.html` definisce la struttura dell'app, carica Chart.js da CDN e include gli script locali.
- `spesa-tracker/css/style.css` contiene tutto lo stile, incluse variabili tema, layout mobile, modali, filtri, timeline, statistiche e impostazioni.
- `spesa-tracker/js/config.js` contiene configurazione runtime minima, inclusa la chiave `localStorage`.
- `spesa-tracker/js/categories.js` contiene categorie e metodi di pagamento statici.
- `spesa-tracker/js/parser.js` interpreta l'input testuale e crea una spesa.
- `spesa-tracker/js/storage.js` gestisce persistenza, import/export e utility dati.
- `spesa-tracker/js/app.js` contiene lo stato UI e quasi tutta la logica applicativa.

La struttura attuale e intenzionalmente semplice ma `app.js` e diventato il centro di molte responsabilita: navigazione, filtri, input, modal, tag, statistiche, import/export e gestione mobile.

Per la mappa dettagliata dei rischi tecnici e dell'ordine consigliato del refactor, vedere `docs/CODE_REVIEW.md`.

## Dati Locali

I dati sono salvati in `localStorage` con chiave `spesa-tracker-data`.

La chiave puo essere sovrascritta da `window.SPESA_TRACKER_CONFIG.storageKey`. Questo serve per pubblicare una versione dev sullo stesso dominio GitHub Pages senza condividere i dati reali della stabile.

La struttura principale e:

```js
{
  spese: [],
  impostazioni: {
    tema: "auto",
    valuta: "EUR",
    simbolo: "€",
    ultimoBackup: null
  }
}
```

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

JSON e il formato di backup completo. CSV e pensato per interoperabilita con fogli di calcolo, ma non conserva tutta la ricchezza del modello dati, per esempio i tag non vengono esportati nel CSV attuale.

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

### Impostazioni

La pagina impostazioni include:

- tema chiaro, scuro o automatico;
- export JSON;
- export CSV;
- import JSON, che sostituisce i dati dopo conferma se ci sono spese esistenti;
- import CSV, che aggiunge le spese importate;
- informazioni su numero spese, periodo coperto e spazio usato;
- cancellazione completa dei dati con conferma.

La roadmap prevede di rendere import/export piu coerenti: un solo flusso UI, scelta del formato dopo il comando, possibilita di aggiungere o sostituire sia per JSON sia per CSV e gestione esplicita degli id duplicati.

Il toggle tema nell'header e pensato come cambio temporaneo; la preferenza stabile del tema si modifica dalle impostazioni.

## Limiti Noti

- Non c'e ancora un service worker: l'app non e pienamente offline.
- Chart.js viene caricato da CDN, quindi le statistiche dipendono dalla rete al primo caricamento.
- Non esiste ancora un sistema di versioni installabili in parallelo o aggiornamenti controllati dall'utente.
- `app.js` e molto grande e accoppia stato, rendering, eventi e workaround mobile.
- Categorie e metodi sono statici nel codice, non personalizzabili dall'app.
- Il CSV non preserva tutti i campi del modello dati.
- La compatibilita iOS ha problemi UI noti ed e priorita bassa rispetto ad Android.
- Il browser desktop e usabile ma non e ancora rifinito quanto l'esperienza mobile.
- Non esiste ancora una suite di test automatizzata.
