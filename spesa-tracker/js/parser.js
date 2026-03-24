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

        // --- Estrai e rimuovi i tags (iniziano con #) ---
        const tags = [];
        const tagRegex = /#([\wàèéìòù]+)/gi;
        let tagMatch;
        while ((tagMatch = tagRegex.exec(descrizione)) !== null) {
            tags.push(tagMatch[1]); // Aggiungiamo il tag al nostro array (senza #)
        }
        // Rimuoviamo i tag trovati dalla descrizione
        descrizione = descrizione.replace(tagRegex, '').replace(/\s+/g, ' ').trim();

        // --- Estrai e rimuovi il metodo di pagamento ---
        const paymentInfo = this._detectPaymentInfo(descrizione.toLowerCase());
        const metodo = paymentInfo.id;
        if (paymentInfo.keyword) {
            // Rimuoviamo la keyword di pagamento esatta dal testo
            const pmRegex = new RegExp('\\b' + paymentInfo.keyword + '\\b', 'i');
            descrizione = descrizione.replace(pmRegex, '').replace(/\s+/g, ' ').trim();
        }

        if (!importo || importo <= 0) return null;
        if (!descrizione) descrizione = 'Spesa';

        // Capitalizza prima lettera
        descrizione = descrizione.charAt(0).toUpperCase() + descrizione.slice(1);

        return {
            importo: Math.round(importo * 100) / 100,
            descrizione,
            // Conserviamo la stringa originale 'input' per cercare la categoria (cattura meglio se prima rimuoviamo i pagamenti)
            categoria: this._detectCategory(input.toLowerCase()),
            metodo: metodo,
            data: new Date().toISOString(),
            tags: tags,
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

    _detectPaymentInfo(text) {
        const methods = [
            { id: 'contanti', regex: /\b(contanti|cash)\b/i },
            { id: 'satispay', regex: /\b(satispay)\b/i },
            { id: 'paypal', regex: /\b(paypal)\b/i },
            { id: 'bonifico', regex: /\b(bonifico)\b/i },
            { id: 'buoni_pasto', regex: /\b(buoni pasto|buono pasto|buonopasto|buonipasto)\b/i },
            { id: 'carta', regex: /\b(carta)\b/i }
        ];

        for (const m of methods) {
            const match = text.match(m.regex);
            if (match) {
                return { id: m.id, keyword: match[0] };
            }
        }
        return { id: 'carta', keyword: null };
    }
};