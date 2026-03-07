/* ============================================
   CATEGORIE & METODI DI PAGAMENTO
   ============================================ */

const CATEGORIES = [
    { id: 'supermercato', nome: 'Supermercato', emoji: '🛒', keywords: ['spesa','supermercato','esselunga','conad','coop','lidl','eurospin','carrefour','pam','despar','md','aldi','penny'] },
    { id: 'bar', nome: 'Bar/Caffè', emoji: '☕', keywords: ['caffè','caffe','cappuccino','cornetto','brioche','espresso','bar','colazione','latte','tè','the'] },
    { id: 'ristorante', nome: 'Ristorante', emoji: '🍝', keywords: ['pizza','sushi','ristorante','trattoria','hamburger','panino','pranzo','cena','pizzeria','kebab','poke','mcdonald','mcd','burger'] },
    { id: 'takeaway', nome: 'Delivery/Asporto', emoji: '🥡', keywords: ['deliveroo','glovo','just eat','justeat','uber eats','ubereats','takeaway','asporto','delivery'] },
    { id: 'drink', nome: 'Drink/Aperitivo', emoji: '🍺', keywords: ['birra','vino','cocktail','aperitivo','spritz','drink','pub','shot','mojito','gin','rum','vodka'] },
    { id: 'casa', nome: 'Casa/Affitto', emoji: '🏠', keywords: ['affitto','mutuo','condominio','casa','arredamento','ikea'] },
    { id: 'bollette', nome: 'Bollette/Utenze', emoji: '💡', keywords: ['bolletta','luce','gas','acqua','enel','eni','a2a','internet','wifi','fibra'] },
    { id: 'trasporti', nome: 'Trasporti', emoji: '🚗', keywords: ['benzina','diesel','treno','bus','metro','taxi','uber','autostrada','parcheggio','bollo','assicurazione','meccanico','gomme','italo','trenitalia','flixbus','monopattino'] },
    { id: 'abbigliamento', nome: 'Abbigliamento', emoji: '👕', keywords: ['maglietta','maglia','pantaloni','scarpe','giacca','vestito','zara','h&m','nike','adidas','felpa','jeans','camicia','cappotto','borsa','accessori','calze','intimo'] },
    { id: 'tech', nome: 'Tech/Elettronica', emoji: '💻', keywords: ['computer','pc','laptop','tablet','cuffie','caricatore','amazon','elettronica','monitor','tastiera','mouse','cavo','usb','hard disk','ssd','iphone','samsung','apple'] },
    { id: 'telefono', nome: 'Telefono/Internet', emoji: '📱', keywords: ['ricarica','iliad','vodafone','tim','wind','tre','ho mobile','fastweb','telefono','cellulare','smartphone','sim'] },
    { id: 'intrattenimento', nome: 'Intrattenimento', emoji: '🎬', keywords: ['cinema','netflix','spotify','disney','prime video','concerto','teatro','museo','mostra','evento','abbonamento','playstation','xbox','nintendo','gioco','videogioco','steam'] },
    { id: 'salute', nome: 'Salute/Farmacia', emoji: '💊', keywords: ['farmacia','medicina','dottore','medico','dentista','visita','analisi','ospedale','ottico','occhiali','lenti','integratore','vitamina'] },
    { id: 'sport', nome: 'Sport/Fitness', emoji: '🏋️', keywords: ['palestra','piscina','calcetto','tennis','padel','corsa','decathlon','sport','yoga','pilates'] },
    { id: 'formazione', nome: 'Formazione', emoji: '🎓', keywords: ['libro','corso','università','scuola','master','udemy','lezione','formazione','workshop'] },
    { id: 'cura', nome: 'Cura personale', emoji: '💇', keywords: ['barbiere','parrucchiere','estetista','profumo','crema','shampoo','sapone','trucco','makeup','smalto'] },
    { id: 'regali', nome: 'Regali', emoji: '🎁', keywords: ['regalo','fiori','pensiero','compleanno','natale'] },
    { id: 'viaggi', nome: 'Viaggi', emoji: '✈️', keywords: ['volo','aereo','hotel','albergo','airbnb','booking','vacanza','viaggio','ostello'] },
    { id: 'tabacchi', nome: 'Tabacchi/Varie', emoji: '🏪', keywords: ['sigarette','tabacchi','tabacchino','gratta','lotto','francobollo'] },
    { id: 'altro', nome: 'Altro', emoji: '📦', keywords: [] }
];

const PAYMENT_METHODS = [
    { id: 'carta', nome: 'Carta', emoji: '💳' },
    { id: 'contanti', nome: 'Contanti', emoji: '💵' },
    { id: 'satispay', nome: 'Satispay', emoji: '📱' },
    { id: 'paypal', nome: 'PayPal', emoji: '🅿️' },
    { id: 'bonifico', nome: 'Bonifico', emoji: '🏦' },
    { id: 'altro_pag', nome: 'Altro', emoji: '💰' }
];