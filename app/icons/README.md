# Icone App

Salva qui le icone definitive dell'app. I nomi devono restare esattamente questi:

- `favicon-16.png`: 16 x 16 px, PNG.
- `favicon-32.png`: 32 x 32 px, PNG.
- `apple-touch-icon.png`: 180 x 180 px, PNG.
- `icon-192.png`: 192 x 192 px, PNG.
- `icon-512.png`: 512 x 512 px, PNG.
- `maskable-192.png`: 192 x 192 px, PNG maskable.
- `maskable-512.png`: 512 x 512 px, PNG maskable.

Consigli pratici:

- Usa un'immagine sorgente quadrata almeno 1024 x 1024 px, idealmente PNG o SVG.
- Per le favicon piccole, il simbolo deve essere molto leggibile anche a 16 px.
- Per `icon-*`, puoi usare trasparenza, ma uno sfondo pieno o un simbolo su riquadro rende meglio su Android.
- Per `maskable-*`, non usare trasparenza importante sui bordi: metti lo sfondo pieno e tieni il contenuto principale dentro il safe area centrale, circa l'80% dell'immagine.
- Se non vuoi gestire varianti diverse, puoi generare tutti i file dalla stessa icona quadrata, ma le versioni maskable dovrebbero avere piu margine.
