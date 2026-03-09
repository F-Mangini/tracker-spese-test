/* ============================================
   PARSER — Interpreta input in linguaggio naturale
   ============================================ */

const Parser = {

    parse(input) {
        input = input.trim();
        if (!input) return null;

        let importo = null;
        let descrizione = input;

        /* --- Estrai importo --- */
        // Ordine di priorità: "€1.50", "1.50€", "1,50 euro", "1.50", "15"
        const patterns = [
            /€\s*(\d+[.,]\d{1,2})/,          // €1.50 o € 1,50
            /(\d+[.,]\d{1,2})\s*€/,          // 1.50€
            /(\d+[.,]\d{1,2})\s*euro/i,       // 1.50 euro
            /(\d+[.,]\d{1,2})/,               // 1.50 (numero con decimali)
            /\b(\d+)\b/                        // 15  (numero intero)
        ];

        for (const pat of patterns) {
            const m = input.match(pat);
            if (m) {
                importo = parseFloat(m[1].replace(',', '.'));
                // Rimuovi l'importo dalla descrizione
                descrizione = input
                    .replace(m[0], '')
                    .replace(/\beuro\b/gi, '')
                    .replace(/€/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
                break;
            }
        }

        if (!importo || importo <= 0) return null;
        if (!descrizione) descrizione = 'Spesa';

        // Capitalizza prima lettera
        descrizione = descrizione.charAt(0).toUpperCase() + descrizione.slice(1);

        return {
            importo: Math.round(importo * 100) / 100,
            descrizione,
            categoria: this._detectCategory(input.toLowerCase()),
            metodo: this._detectPayment(input.toLowerCase()),
            data: new Date().toISOString(),
            tags: [],
            nota: ''
        };
    },

    _detectCategory(text) {
        for (const cat of CATEGORIES) {
            if (cat.id === 'altro') continue;
            for (const kw of cat.keywords) {
                if (text.includes(kw)) return cat.id;
            }
        }
        return 'altro';
    },

    _detectPayment(text) {
        if (/\b(contanti|cash)\b/.test(text)) return 'contanti';
        if (/\b(satispay)\b/.test(text)) return 'satispay';
        if (/\b(paypal)\b/.test(text)) return 'paypal';
        if (/\b(bonifico)\b/.test(text)) return 'bonifico';
        return 'carta'; // default
    }
};