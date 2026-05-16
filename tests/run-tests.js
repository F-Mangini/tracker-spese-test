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
