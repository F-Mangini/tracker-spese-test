/* ============================================
   CATEGORIE & METODI DI PAGAMENTO
   ============================================ */

const CATEGORIES = [
    { id: 'abbigliamento', nome: 'Abbigliamento', emoji: '👕', keywords: ['maglietta', 'maglia', 'maglione', 'pantaloni', 'scarpe', 'giacca', 'vestito', 'zara', 'h&m', 'nike', 'adidas', 'felpa', 'jeans', 'camicia', 'cappotto', 'calze', 'intimo', 'gonna', 'top', 'cappello', 'sciarpa', 'guanti', 'body', 'pantaloncini', 'shorts', 'mutande', 'reggiseno', 'boxer', 'slip', 'calzini', 'collant', 'cravatta', 'blazer', 'costume', 't-shirt', 'corsetto', 'coprispalla'] },
    { id: 'accessori', nome: 'Accessori', emoji: '⌚', keywords: ['orologio', 'borsa', 'accessori', 'collana', 'orecchini', 'anello', 'bracciale', 'portafoglio', 'zaino', 'portachiavi', 'occhiali da sole', 'custodia', 'cover'] },
    { id: 'bar', nome: 'Bar', emoji: '☕', keywords: ['caffè', 'caffe', 'acqua', 'cappuccino', 'cornetto', 'brioche', 'espresso', 'bar', 'colazione', 'latte', 'tè', 'the', 'gelato', 'biscotto', 'pasticciotto', 'granita', 'espressino', 'granita', 'cioccolata', 'ginseng', 'crepes', 'waffle', 'yogurt', 'torta'] },
    { id: 'bollette', nome: 'Bollette', emoji: '💡', keywords: ['bolletta', 'luce', 'gas', 'acqua', 'enel', 'eni', 'a2a', 'internet', 'wifi', 'fibra', 'utenze'] },
    { id: 'casa', nome: 'Casa', emoji: '🏠', keywords: ['affitto', 'mutuo', 'condominio', 'casa', 'arredamento', 'ikea'] },
    { id: 'cura', nome: 'Cura personale', emoji: '💇', keywords: ['barbiere', 'parrucchiere', 'estetista', 'profumo', 'crema', 'shampoo', 'sapone', 'trucco', 'makeup', 'smalto', 'rossetto', 'eyeliner', 'matita', 'mascara', 'blush', 'fondotinta', 'cipria', 'ombretto', 'capelli', 'taglio', 'unghie', 'manicure', 'pedicure', 'sopracciglia', 'ceretta', 'depilazione', 'tinta', 'lucidalabbra', 'rasoio', 'lametta', 'pennello', 'spazzolino', 'dentifricio', 'collutorio', 'deodorante', 'bagnoschiuma', 'doccia', 'dopobarba'] },
    { id: 'drink', nome: 'Drink', emoji: '🍺', keywords: ['birra', 'vino', 'cocktail', 'aperitivo', 'spritz', 'drink', 'shot', 'mojito', 'gin', 'rum', 'vodka', 'amaro'] },
    { id: 'formazione', nome: 'Formazione', emoji: '🎓', keywords: ['libro', 'corso', 'università', 'scuola', 'master', 'udemy', 'lezione', 'formazione', 'workshop'] },
    { id: 'intrattenimento', nome: 'Intrattenimento', emoji: '🎬', keywords: ['cinema', 'netflix', 'spotify', 'disney', 'prime video', 'concerto', 'teatro', 'museo', 'mostra', 'evento', 'playstation', 'xbox', 'nintendo', 'gioco', 'videogioco', 'steam', 'bowling', 'biliardo', 'ice hockey', 'biliardino', 'sala giochi'] },
    { id: 'produttività', nome: 'Produttività', emoji: '🤖', keywords: ['produttività', 'produttivita', 'chatgpt', 'claude', 'gemini', 'kimi', 'copilot', 'claude code', 'codex', 'perplexity', 'colab', 'server', 'gpu'] },
    { id: 'regali', nome: 'Regali', emoji: '🎁', keywords: ['regalo', 'fiori', 'pensiero', 'compleanno', 'natale'] },
    { id: 'ristorante', nome: 'Ristorante', emoji: '🍝', keywords: ['pizza', 'sushi', 'ristorante', 'trattoria', 'hamburger', 'panino', 'pranzo', 'cena', 'pizzeria', 'kebab', 'poke', 'mcdonald', 'mcd', 'burger', 'macelleria', 'braceria'] },
    { id: 'salute', nome: 'Salute', emoji: '💊', keywords: ['farmacia', 'medicina', 'dottore', 'medico', 'dentista', 'visita', 'analisi', 'ospedale', 'ottico', 'occhiali', 'lenti', 'integratore', 'vitamina'] },
    { id: 'supermercato', nome: 'Supermercato', emoji: '🛒', keywords: ['spesa', 'supermercato', 'esselunga', 'conad', 'coop', 'lidl', 'eurospin', 'carrefour', 'pam', 'despar', 'md', 'aldi', 'penny', 'famila', 'casa del detersivo', 'acqua e sapone'] },
    { id: 'sport', nome: 'Sport', emoji: '🏋️', keywords: ['palestra', 'piscina', 'partita', 'calcetto', 'tennis', 'padel', 'beach', 'kart', 'pallavolo', 'paintball', 'decathlon', 'sport', 'yoga', 'pilates'] },
    { id: 'tabacchi', nome: 'Tabacchi', emoji: '🏪', keywords: ['sigarette', 'tabacchi', 'tabacchino', 'gratta', 'lotto', 'francobollo', 'gomme'] },
    { id: 'takeaway', nome: 'Delivery', emoji: '🥡', keywords: ['deliveroo', 'glovo', 'just eat', 'justeat', 'uber eats', 'ubereats', 'takeaway', 'asporto', 'delivery', 'consegna', 'spedizione'] },
    { id: 'tech', nome: 'Tech', emoji: '💻', keywords: ['computer', 'pc', 'laptop', 'tablet', 'cuffie', 'caricatore', 'amazon', 'elettronica', 'monitor', 'tastiera', 'mouse', 'cavo', 'usb', 'hard disk', 'ssd', 'iphone', 'samsung', 'apple', 'telefono nuovo'] },
    { id: 'telefono', nome: 'Telefono', emoji: '📱', keywords: ['ricarica', 'iliad', 'vodafone', 'tim', 'wind', 'tre', 'ho mobile', 'fastweb', 'sim'] },
    { id: 'trasporti', nome: 'Trasporti', emoji: '🚗', keywords: ['benzina', 'diesel', 'treno', 'bus', 'metro', 'taxi', 'uber', 'autostrada', 'parcheggio', 'bollo', 'assicurazione', 'meccanico', 'gomme', 'italo', 'trenitalia', 'flixbus', 'monopattino'] },
    { id: 'viaggi', nome: 'Viaggi', emoji: '✈️', keywords: ['volo', 'aereo', 'hotel', 'albergo', 'airbnb', 'booking', 'vacanza', 'viaggio', 'ostello'] },
    { id: 'altro', nome: 'Altro', emoji: '📦', keywords: [] }
];

const PAYMENT_METHODS = [
    { id: 'bonifico', nome: 'Bonifico', emoji: '🏦' },
    { id: 'carta', nome: 'Carta', emoji: '💳' },
    { id: 'contanti', nome: 'Contanti', emoji: '💵' },
    { id: 'paypal', nome: 'PayPal', emoji: '🅿️' },
    { id: 'satispay', nome: 'Satispay', emoji: '📱' },
    { id: 'altro_pag', nome: 'Altro', emoji: '💰' }
];