const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function createLocalStorage() {
    const store = new Map();

    return {
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
            store.set(key, String(value));
        },
        removeItem(key) {
            store.delete(key);
        },
        clear() {
            store.clear();
        }
    };
}

function loadStorage() {
    const context = {
        console,
        localStorage: createLocalStorage(),
        window: {
            SPESA_TRACKER_CONFIG: {
                storageKey: 'test-storage'
            }
        }
    };

    vm.createContext(context);
    const storageCode = fs.readFileSync(path.join(root, 'app/js/storage.js'), 'utf8');
    vm.runInContext(`${storageCode}\nglobalThis.Storage = Storage;`, context);

    return {
        Storage: context.Storage,
        localStorage: context.localStorage
    };
}

function loadParser() {
    const context = { console };
    vm.createContext(context);

    const categoriesCode = fs.readFileSync(path.join(root, 'app/js/categories.js'), 'utf8');
    const parserCode = fs.readFileSync(path.join(root, 'app/js/parser.js'), 'utf8');
    vm.runInContext(
        `${categoriesCode}\n${parserCode}\nglobalThis.Parser = Parser;`,
        context
    );

    return context.Parser;
}

function loadFilters() {
    const context = { console };
    vm.createContext(context);

    const filtersCode = fs.readFileSync(path.join(root, 'app/js/filters.js'), 'utf8');
    vm.runInContext(`${filtersCode}\nglobalThis.ExpenseFilters = ExpenseFilters;`, context);

    return context.ExpenseFilters;
}

function loadStats() {
    const context = { console };
    vm.createContext(context);

    const statsCode = fs.readFileSync(path.join(root, 'app/js/stats.js'), 'utf8');
    vm.runInContext(`${statsCode}\nglobalThis.StatsData = StatsData;`, context);

    return context.StatsData;
}

function expense(overrides = {}) {
    return {
        id: 'expense-1',
        importo: 1.5,
        descrizione: 'Caffe',
        categoria: 'bar',
        metodo: 'carta',
        data: '2026-05-16T10:00:00.000Z',
        tags: ['colazione'],
        nota: '',
        creatoIl: '2026-05-16T10:00:00.000Z',
        modificatoIl: '2026-05-16T10:00:00.000Z',
        ...overrides
    };
}

const tests = [];

function test(name, fn) {
    tests.push({ name, fn });
}

test('Storage aggiunge e normalizza una spesa prima del salvataggio', () => {
    const { Storage } = loadStorage();

    const result = Storage.addSpesa({
        importo: '1,50',
        descrizione: 'Caffe',
        categoria: 'bar',
        metodo: 'carta',
        data: '2026-05-16T10:00:00.000Z',
        tags: ['#colazione', 'colazione'],
        nota: ''
    });

    assert.equal(result.success, true);
    assert.equal(result.spesa.importo, 1.5);
    assert.deepEqual(result.spesa.tags, ['colazione']);

    const exported = Storage.exportJSON();
    assert.equal(exported.success, true);

    const data = JSON.parse(exported.content);
    assert.equal(data.schemaVersion, 1);
    assert.equal(data.spese.length, 1);
});

test('Storage blocca i salvataggi se il JSON locale e corrotto', () => {
    const { Storage, localStorage } = loadStorage();
    localStorage.setItem(Storage.KEY, '{"spese":');

    const result = Storage.addSpesa(expense({ id: undefined }));

    assert.equal(result.success, false);
    assert.equal(localStorage.getItem(Storage.KEY), '{"spese":');

    const raw = Storage.exportRaw();
    assert.equal(raw.success, true);
    assert.equal(raw.content, '{"spese":');
});

test('Import JSON in aggiunta rigenera id duplicati e conserva le impostazioni attuali', () => {
    const { Storage, localStorage } = loadStorage();
    const current = {
        schemaVersion: 1,
        spese: [expense({ id: 'same-id', descrizione: 'Esistente' })],
        impostazioni: { tema: 'dark', valuta: 'EUR', simbolo: '€', ultimoBackup: null }
    };
    const backup = {
        schemaVersion: 1,
        spese: [expense({ id: 'same-id', descrizione: 'Importata' })],
        impostazioni: { tema: 'light', valuta: 'EUR', simbolo: '€', ultimoBackup: null }
    };

    localStorage.setItem(Storage.KEY, JSON.stringify(current));

    const result = Storage.importJSON(JSON.stringify(backup), { mode: 'append' });

    assert.equal(result.success, true);
    assert.equal(result.regeneratedIds, 1);

    const saved = JSON.parse(localStorage.getItem(Storage.KEY));
    assert.equal(saved.spese.length, 2);
    assert.equal(saved.spese[0].descrizione, 'Importata');
    assert.notEqual(saved.spese[0].id, 'same-id');
    assert.equal(saved.impostazioni.tema, 'dark');
});

test('Import JSON in sostituzione crea snapshot e importa le impostazioni del backup', () => {
    const { Storage, localStorage } = loadStorage();
    const current = {
        schemaVersion: 1,
        spese: [expense({ id: 'old-id', descrizione: 'Vecchia' })],
        impostazioni: { tema: 'dark', valuta: 'EUR', simbolo: '€', ultimoBackup: null }
    };
    const backup = {
        schemaVersion: 1,
        spese: [expense({ id: 'new-id', descrizione: 'Nuova' })],
        impostazioni: { tema: 'light', valuta: 'EUR', simbolo: '€', ultimoBackup: null }
    };

    localStorage.setItem(Storage.KEY, JSON.stringify(current));

    const result = Storage.importJSON(JSON.stringify(backup), { mode: 'replace' });

    assert.equal(result.success, true);

    const saved = JSON.parse(localStorage.getItem(Storage.KEY));
    const snapshot = JSON.parse(localStorage.getItem(`${Storage.KEY}:snapshot`));

    assert.equal(saved.spese.length, 1);
    assert.equal(saved.spese[0].id, 'new-id');
    assert.equal(saved.impostazioni.tema, 'light');
    assert.equal(snapshot.data.spese[0].id, 'old-id');
});

test('Import CSV valida decimali italiani, delimiter punto e virgola e campi quotati', () => {
    const { Storage } = loadStorage();
    const csv = [
        'data;ora;importo;descrizione;categoria;metodo;tags;nota',
        '16/05/2026;09:30;1,50;"Caffe, brioche";bar;carta;"colazione|lavoro";"nota su due',
        'righe"'
    ].join('\n');

    const preview = Storage.previewImportCSV(csv);

    assert.equal(preview.success, true);
    assert.equal(preview.count, 1);
    assert.equal(preview.data.spese[0].importo, 1.5);
    assert.equal(preview.data.spese[0].descrizione, 'Caffe, brioche');
    assert.deepEqual(preview.data.spese[0].tags, ['colazione', 'lavoro']);
    assert.equal(preview.data.spese[0].nota, 'nota su due\nrighe');
});

test('Import CSV rifiuta date impossibili invece di normalizzarle', () => {
    const { Storage } = loadStorage();
    const csv = [
        'data,ora,importo,descrizione,categoria,metodo',
        '31/02/2026,09:30,1.50,Caffe,bar,carta'
    ].join('\n');

    const preview = Storage.previewImportCSV(csv);

    assert.equal(preview.success, false);
    assert.equal(preview.code, 'invalid-date');
});

test('Parser conserva il flusso base di inserimento rapido', () => {
    const Parser = loadParser();
    const result = Parser.parse('caffe 1,50 #colazione contanti');

    assert.equal(result.importo, 1.5);
    assert.equal(result.metodo, 'contanti');
    assert.deepEqual(result.tags, ['colazione']);
    assert.equal(result.categoria, 'bar');
});

test('Filtri combinano ricerca, categoria, metodo, importo e date', () => {
    const ExpenseFilters = loadFilters();
    const spese = [
        expense({
            id: 'match',
            importo: 12,
            descrizione: 'Pizza margherita',
            categoria: 'ristorante',
            metodo: 'carta',
            data: '2026-05-10T12:00:00.000Z',
            tags: ['amici']
        }),
        expense({
            id: 'wrong-category',
            importo: 12,
            descrizione: 'Pizza surgelata',
            categoria: 'supermercato',
            metodo: 'carta',
            data: '2026-05-10T12:00:00.000Z'
        }),
        expense({
            id: 'wrong-amount',
            importo: 4,
            descrizione: 'Pizza piccola',
            categoria: 'ristorante',
            metodo: 'carta',
            data: '2026-05-10T12:00:00.000Z'
        }),
        expense({
            id: 'wrong-date',
            importo: 12,
            descrizione: 'Pizza vecchia',
            categoria: 'ristorante',
            metodo: 'carta',
            data: '2026-04-30T12:00:00.000Z'
        })
    ];

    const result = ExpenseFilters.apply(spese, {
        query: 'pizza',
        categories: new Set(['ristorante']),
        methods: new Set(['carta']),
        amountMin: 10,
        amountMax: 15,
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
    });

    assert.deepEqual(result.map(s => s.id), ['match']);
});

test('Filtri non-data ignorano il periodo ma mantengono gli altri vincoli', () => {
    const ExpenseFilters = loadFilters();
    const spese = [
        expense({
            id: 'old-restaurant',
            importo: 20,
            descrizione: 'Cena',
            categoria: 'ristorante',
            metodo: 'contanti',
            data: '2026-04-01T12:00:00.000Z',
            nota: 'rimborso viaggio'
        }),
        expense({
            id: 'card-payment',
            importo: 20,
            descrizione: 'Cena',
            categoria: 'ristorante',
            metodo: 'carta',
            data: '2026-04-01T12:00:00.000Z',
            nota: 'rimborso viaggio'
        })
    ];

    const filters = {
        query: 'rimborso',
        categories: new Set(['ristorante']),
        methods: new Set(['contanti']),
        amountMin: 10,
        amountMax: 30,
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
    };

    assert.deepEqual(ExpenseFilters.apply(spese, filters).map(s => s.id), []);
    assert.deepEqual(ExpenseFilters.applyNonDate(spese, filters).map(s => s.id), ['old-restaurant']);
    assert.equal(ExpenseFilters.countActive(filters), 5);
});

test('Statistiche aggregano dati giornalieri includendo giorni vuoti', () => {
    const StatsData = loadStats();
    const spese = [
        expense({ id: 'a', importo: 10.25, data: '2026-05-01T10:00:00' }),
        expense({ id: 'b', importo: 4.75, data: '2026-05-03T10:00:00' })
    ];

    const result = StatsData.buildDailyBarData(
        spese,
        new Date('2026-05-01T00:00:00'),
        new Date('2026-05-03T23:59:59'),
        { now: new Date('2026-05-03T12:00:00') }
    );

    assert.deepEqual(result.data, [10.25, 0, 4.75]);
});

test('Statistiche aggregano dati settimanali dal lunedi alla domenica', () => {
    const StatsData = loadStats();
    const spese = [
        expense({ id: 'a', importo: 10, data: '2026-04-28T10:00:00' }),
        expense({ id: 'b', importo: 5, data: '2026-05-05T10:00:00' }),
        expense({ id: 'c', importo: 2, data: '2026-05-17T10:00:00' })
    ];

    const result = StatsData.buildWeeklyBarData(
        spese,
        new Date('2026-04-28T00:00:00'),
        new Date('2026-05-17T23:59:59'),
        { now: new Date('2026-05-17T12:00:00') }
    );

    assert.deepEqual(result.data, [10, 5, 2]);
});

test('Statistiche aggregano dati mensili e riepilogo categorie/top spese', () => {
    const StatsData = loadStats();
    const spese = [
        expense({ id: 'a', importo: 10, categoria: 'bar', data: '2026-01-10T10:00:00' }),
        expense({ id: 'b', importo: 7, categoria: 'ristorante', data: '2026-03-10T10:00:00' }),
        expense({ id: 'c', importo: 3, categoria: 'bar', data: '2026-03-11T10:00:00' })
    ];
    const start = new Date('2026-01-01T00:00:00');
    const end = new Date('2026-03-31T23:59:59');

    const bars = StatsData.buildMonthlyBarData(spese, start, end, {
        now: new Date('2026-03-31T12:00:00')
    });
    const summary = StatsData.summarizeExpenses(spese, start, end, {
        now: new Date('2026-03-31T12:00:00'),
        topLimit: 2
    });

    assert.deepEqual(bars.data, [10, 0, 10]);
    assert.equal(summary.total, 20);
    assert.deepEqual(summary.categoryTotals, [['bar', 13], ['ristorante', 7]]);
    assert.deepEqual(summary.topExpenses.map(s => s.id), ['a', 'b']);
});

let failed = 0;

for (const { name, fn } of tests) {
    try {
        fn();
        console.log(`ok - ${name}`);
    } catch (error) {
        failed += 1;
        console.error(`not ok - ${name}`);
        console.error(error);
    }
}

if (failed > 0) {
    process.exitCode = 1;
} else {
    console.log(`\n${tests.length} test superati.`);
}
