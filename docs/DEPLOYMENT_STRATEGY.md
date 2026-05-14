# Strategia Stabile e Dev

Questo documento definisce il minimo necessario per lavorare al refactor senza perdere una versione stabile usabile ogni giorno.

## Stato Attuale

- `main` e la versione stabile.
- `codex/refactor` e il branch su cui avviene il refactor.
- GitHub Pages oggi pubblica la versione stabile da `main`.
- La versione stabile e usata dal maintainer e da amici.
- Il maintainer usa GitHub Free e non vuole fare upgrade.

## Obiettivo Immediato

Avere due accessi sempre chiari:

- **Stabile**: link per uso quotidiano, aggiornato solo quando si decide di promuovere una versione.
- **Dev**: link per testare modifiche del refactor prima di promuoverle.

Questo non e ancora il sistema definitivo di aggiornamenti controllati dall'app. E il canale minimo per lavorare in sicurezza prima della futura PWA/version manager.

URL attesi per questa repository dopo la rinomina a `tracker-spese`:

```text
https://f-mangini.github.io/tracker-spese/        -> stabile
https://f-mangini.github.io/tracker-spese/stable/ -> stabile
https://f-mangini.github.io/tracker-spese/dev/    -> sviluppo
```

Se la repository viene rinominata, questi URL devono essere aggiornati nella documentazione e verificati su GitHub Pages dopo il primo deploy.

Il vecchio URL `https://f-mangini.github.io/tracker-spese-test/spesa-tracker/` non e piu il target principale con questa strategia e puo restituire 404.

## Vincolo Critico: `localStorage`

`localStorage` e legato all'origine, non al path.

Questo significa che due URL come:

```text
https://utente.github.io/repo/stable/
https://utente.github.io/repo/dev/
```

condividono gli stessi dati se il codice usa la stessa chiave `localStorage`.

Quindi, se dev e stabile sono pubblicate sullo stesso dominio GitHub Pages, la dev deve usare una chiave diversa, per esempio:

```text
spesa-tracker-data
spesa-tracker-data-dev
```

Senza questa separazione, un bug nella dev potrebbe modificare o corrompere i dati reali usati dalla stabile.

## Soluzione Consigliata

Usare GitHub Pages con un unico sito, ma pubblicare due cartelle:

```text
/stable/  -> contenuto da main
/dev/     -> contenuto da codex/refactor
/         -> redirect o copia della stabile
```

Per farlo in modo pulito, usare una GitHub Action che assembla l'artefatto Pages:

1. checkout di `main`;
2. copia di `spesa-tracker/` in `public/stable/` e opzionalmente in `public/`;
3. checkout di `codex/refactor`;
4. copia di `spesa-tracker/` in `public/dev/`;
5. per la build dev, impostare una storage key separata;
6. deploy di `public/` su GitHub Pages.

GitHub Pages per repository pubblici e disponibile su GitHub Free. La pubblicazione puo avvenire da branch/folder o tramite GitHub Actions.

## Cambio Tecnico Minimo Necessario

Prima di pubblicare una dev accanto alla stabile, rendere configurabile la chiave di storage.

Implementazione scelta:

- `spesa-tracker/js/config.js` definisce `window.SPESA_TRACKER_CONFIG`;
- `index.html` carica `config.js` prima di `storage.js`;
- `storage.js` usa `window.SPESA_TRACKER_CONFIG.storageKey` con fallback a `spesa-tracker-data`;
- la stabile usa `spesa-tracker-data`;
- il workflow Pages sovrascrive `public/dev/js/config.js` con `spesa-tracker-data-dev`.

Quando la dev viene pubblicata accanto alla stabile, deve essere distinguibile anche nel manifest e nella UI installata: nome app e icona dev non devono confondersi con quelli della versione quotidiana. Il nome stabile completo e `Where's My Money?`, con `WMM` come nome breve sotto l'icona mobile.

Questa modifica e piccola ma tocca il salvataggio dati, quindi va fatta con cautela e verificata prima del refactor grosso.

## Workflow GitHub Pages

Il workflow `.github/workflows/pages.yml`:

- parte su push verso `main` o `codex/refactor`;
- fa checkout di `main` in `stable-src`;
- fa checkout di `codex/refactor` in `dev-src`;
- copia `stable-src/spesa-tracker/` in `public/` e `public/stable/`;
- copia `dev-src/spesa-tracker/` in `public/dev/`;
- sovrascrive la config dev con storage key separata;
- pubblica `public/` su GitHub Pages.

Nota importante: il workflow deve esistere anche sul branch di default (`main`). Se resta solo su `codex/refactor`, GitHub Pages impostato su Actions puo non avere un workflow valido da eseguire. Per questo il workflow e stato aggiunto anche a `main` come modifica infrastrutturale minima, senza portare il refactor nella stabile.

## Azione Manuale Richiesta al Maintainer

Quando il workflow sara presente su GitHub, nelle impostazioni della repository:

1. aprire `Settings`;
2. aprire `Pages`;
3. in `Build and deployment`, impostare `Source` su `GitHub Actions`;
4. salvare se richiesto.

Le Actions devono essere abilitate in `Settings` -> `Actions` -> `General`. Il workflow dichiara gia i permessi minimi necessari:

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

Non cambiare la sorgente Pages prima che il workflow sia disponibile sul remoto, altrimenti il deploy stabile potrebbe fermarsi finche non parte la prima Action corretta.

## Alternative

### Secondo repo GitHub Pages

Creare un repo pubblico separato per la dev. E semplice come concetto, ma se resta sotto lo stesso dominio `utente.github.io`, il problema `localStorage` rimane: path diversi non bastano.

### Solo test locale

Usare un server locale per testare la dev. E utile, ma non basta se serve un link sempre disponibile da telefono o per amici/tester.

### Version manager definitivo subito

Implementare subito service worker, manifest release, cache versionate e UI di aggiornamento. E la direzione futura, ma e troppo grande come prerequisito immediato del refactor.

## Decisione Operativa

Prima del refactor strutturale:

1. rendere configurabile `Storage.KEY`;
2. predisporre pubblicazione dev con storage separato;
3. pubblicare il workflow su GitHub;
4. cambiare GitHub Pages Source a `GitHub Actions`;
5. verificare gli URL stabile/dev;
6. mantenere `main` come fonte stabile;
7. usare `codex/refactor` per test e iterazione.

La Fase 5 della code review resta valida per la PWA/version manager definitiva, ma viene preceduta da una fase piu piccola: canale stabile/dev sicuro.
