# Strategia Stabile e Dev

Questo documento definisce il minimo necessario per lavorare al refactor senza perdere una versione stabile usabile ogni giorno.

## Stato Attuale

- `main` e la versione stabile.
- `codex/refactor` e il branch su cui avviene il refactor.
- GitHub Pages pubblica `/` e `/stable/` da `main`, e `/dev/` da `codex/refactor`.
- Il workflow Pages parte solo da `main`, per rispettare le protection rules dell'environment `github-pages`.
- La versione stabile e usata dal maintainer e da amici.
- Il maintainer usa GitHub Free e non vuole fare upgrade.

## Obiettivo Immediato

Stato: completato il 2026-05-15.

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

Gli URL del nome repository precedente non sono piu il target principale con questa strategia e possono restituire 404.

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
2. copia di `app/` in `public/stable/` e opzionalmente in `public/`;
3. checkout di `codex/refactor`;
4. copia di `app/` in `public/dev/`;
5. per la build dev, impostare una storage key separata;
6. deploy di `public/` su GitHub Pages.

GitHub Pages per repository pubblici e disponibile su GitHub Free. La pubblicazione puo avvenire da branch/folder o tramite GitHub Actions.

## Cambio Tecnico Minimo Necessario

Prima di pubblicare una dev accanto alla stabile, rendere configurabile la chiave di storage.

Implementazione scelta:

- `app/js/config.js` definisce `window.SPESA_TRACKER_CONFIG`;
- `index.html` carica `config.js` prima di `storage.js`;
- `storage.js` usa `window.SPESA_TRACKER_CONFIG.storageKey` con fallback a `spesa-tracker-data`;
- la stabile usa `spesa-tracker-data`;
- il workflow Pages sovrascrive `public/dev/js/config.js` con `spesa-tracker-data-dev`.

Quando la dev viene pubblicata accanto alla stabile, deve essere distinguibile anche nel manifest e nella UI installata: nome app e icona dev non devono confondersi con quelli della versione quotidiana. Il nome stabile completo e `Where's My Money?`, con `WMM` come nome breve sotto l'icona mobile.

Implementazione branding:

- la stabile usa `app/manifest.json`, nome `Where's My Money?`, short name `WMM` e icone in `app/icons/stable/`;
- la dev usa `app/manifest.dev.json`, nome `Where's My Bug?`, short name `WMB` e icone in `app/icons/dev/`;
- il workflow copia `app/manifest.dev.json` in `public/dev/manifest.json`;
- il workflow riscrive i link favicon/apple touch di `public/dev/index.html` da `icons/stable/` a `icons/dev/`;
- il sorgente resta stabile di default, cosi una promozione dev -> stabile non porta per errore nome e icone dev nella stabile.

Questa modifica e piccola ma tocca il salvataggio dati, quindi va fatta con cautela e verificata prima del refactor grosso.

## Workflow GitHub Pages

Il workflow `.github/workflows/pages.yml`:

- parte su push verso `main` o con avvio manuale;
- fa checkout di `main` in `stable-src`;
- fa checkout di `codex/refactor` in `dev-src`;
- copia `stable-src/app/` in `public/` e `public/stable/`;
- copia `dev-src/app/` in `public/dev/`;
- sostituisce `public/dev/manifest.json` con `dev-src/app/manifest.dev.json`;
- riscrive i link icone della dev verso `icons/dev/`;
- sovrascrive la config dev con storage key separata;
- pubblica `public/` su GitHub Pages.

Nota importante: il workflow deve esistere sul branch di default (`main`) e il deploy deve partire da `main`. L'environment `github-pages` rifiuta deploy diretti da `codex/refactor`, quindi un push sulla dev non pubblica da solo il sito.

## Promozione Dev a Stabile

Quando la versione dev e stata testata ed e pronta per l'uso quotidiano:

1. verificare `https://f-mangini.github.io/tracker-spese/dev/`;
2. fare merge intenzionale di `codex/refactor` in `main`;
3. controllare che `.github/workflows/pages.yml` resti triggerato solo da `main`;
4. pushare `main`;
5. attendere il workflow Pages;
6. verificare `https://f-mangini.github.io/tracker-spese/` e `https://f-mangini.github.io/tracker-spese/stable/`.

Portare tutto `codex/refactor` su `main` va bene quando tutto cio che contiene e pronto per diventare stabile. Se solo una parte e pronta, preferire cherry-pick o un branch di release. Copiare solo `app/` e sconsigliato come abitudine, perche anche documentazione, workflow, manifest e config possono essere parte della release.

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

Completato:

- `Storage.KEY` e configurabile;
- la dev usa storage separato;
- il workflow pubblica stabile e dev da GitHub Actions;
- gli URL stabile/dev sono verificabili;
- `main` resta fonte stabile;
- `codex/refactor` resta fonte della dev.

La Fase 5 della code review resta valida per la PWA/version manager definitiva, ma viene preceduta da una fase piu piccola: canale stabile/dev sicuro.
