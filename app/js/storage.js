/* ============================================
   STORAGE - Gestione dati in localStorage
   ============================================ */

const Storage = {
    SCHEMA_VERSION: 1,

    KEY: (
        typeof window !== 'undefined' &&
        window.SPESA_TRACKER_CONFIG &&
        window.SPESA_TRACKER_CONFIG.storageKey
    ) || 'spesa-tracker-data',

    _lastStatus: { ok: true, error: null, warnings: [] },

    /* --- Struttura dati predefinita --- */
    _defaultSettings() {
        return {
            tema: 'auto',
            valuta: 'EUR',
            simbolo: '€',
            ultimoBackup: null
        };
    },

    _defaultData() {
        return {
            schemaVersion: this.SCHEMA_VERSION,
            spese: [],
            impostazioni: this._defaultSettings()
        };
    },

    _snapshotKey() {
        return `${this.KEY}:snapshot`;
    },

    /* --- Risultati espliciti --- */
    _ok(payload = {}) {
        return { success: true, ...payload };
    },

    _fail(error, code = 'storage-error', payload = {}) {
        return { success: false, error, code, ...payload };
    },

    _setStatus(result) {
        this._lastStatus = {
            ok: !!result.success,
            error: result.success ? null : result.error,
            code: result.code || null,
            warnings: result.warnings || []
        };
    },

    getStatus() {
        const result = this._readStoredData();
        return {
            ok: result.success,
            error: result.success ? null : result.error,
            code: result.code || null,
            warnings: result.warnings || [],
            storageKey: this.KEY,
            snapshotKey: this._snapshotKey(),
            schemaVersion: this.SCHEMA_VERSION
        };
    },

    getRawData() {
        try {
            return localStorage.getItem(this.KEY) || '';
        } catch (_) {
            return '';
        }
    },

    exportRaw() {
        const raw = this.getRawData();
        if (!raw) {
            return this._fail('Non ci sono dati grezzi da esportare.', 'empty-raw');
        }
        return this._ok({ content: raw });
    },

    /* --- Lettura / Scrittura --- */
    _readStoredData() {
        let raw = '';

        try {
            raw = localStorage.getItem(this.KEY);
        } catch (e) {
            const result = this._fail('localStorage non leggibile.', 'read-failed', { cause: e });
            this._setStatus(result);
            return result;
        }

        if (!raw) {
            const result = this._ok({ data: this._defaultData(), warnings: [] });
            this._setStatus(result);
            return result;
        }

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            const result = this._fail(
                'I dati locali non sono JSON leggibile. Esporta i dati grezzi prima di salvare.',
                'corrupt-json',
                { raw, cause: e }
            );
            this._setStatus(result);
            return result;
        }

        const normalized = this._normalizeData(parsed, { source: 'storage' });
        if (!normalized.success) {
            const result = this._fail(
                normalized.error,
                normalized.code || 'invalid-storage-data',
                { raw, warnings: normalized.warnings || [] }
            );
            this._setStatus(result);
            return result;
        }

        this._setStatus(normalized);
        return normalized;
    },

    _load() {
        const result = this._readStoredData();
        return result.success ? result.data : this._defaultData();
    },

    _loadForWrite() {
        const result = this._readStoredData();
        if (!result.success) {
            return this._fail(
                'Salvataggio bloccato: i dati locali non sono leggibili. Esporta i dati grezzi prima di continuare.',
                result.code || 'write-blocked',
                { raw: result.raw || this.getRawData() }
            );
        }
        return result;
    },

    _save(data) {
        const normalized = this._normalizeData(data, { source: 'save' });
        if (!normalized.success) {
            this._setStatus(normalized);
            return normalized;
        }

        try {
            localStorage.setItem(this.KEY, JSON.stringify(normalized.data));
            this._setStatus(normalized);
            return this._ok({ data: normalized.data, warnings: normalized.warnings || [] });
        } catch (e) {
            const result = this._fail(
                'Errore nel salvataggio. Lo spazio del browser potrebbe essere esaurito: esporta i dati.',
                'save-failed',
                { cause: e }
            );
            this._setStatus(result);
            return result;
        }
    },

    _saveSnapshot(data, reason) {
        const snapshot = {
            schemaVersion: this.SCHEMA_VERSION,
            creatoIl: new Date().toISOString(),
            reason,
            data
        };

        try {
            localStorage.setItem(this._snapshotKey(), JSON.stringify(snapshot));
            return this._ok();
        } catch (e) {
            return this._fail(
                'Non sono riuscito a creare uno snapshot locale. Esporta manualmente prima di sostituire o cancellare i dati.',
                'snapshot-failed',
                { cause: e }
            );
        }
    },

    /* --- CRUD Spese --- */
    getSpese() {
        return this._clone(this._load().spese);
    },

    addSpesa(spesa) {
        const current = this._loadForWrite();
        if (!current.success) return current;

        const now = new Date().toISOString();
        const normalized = this._normalizeSpesa(
            {
                ...spesa,
                id: this._uid(),
                creatoIl: now,
                modificatoIl: now
            },
            { index: 0 }
        );

        if (!normalized.success) return normalized;

        const data = current.data;
        data.spese.unshift(normalized.spesa);

        const saved = this._save(data);
        if (!saved.success) return saved;

        return this._ok({ spesa: normalized.spesa, warnings: saved.warnings || [] });
    },

    updateSpesa(id, updates) {
        const current = this._loadForWrite();
        if (!current.success) return current;

        const data = current.data;
        const i = data.spese.findIndex(s => s.id === id);
        if (i === -1) return this._fail('Spesa non trovata.', 'expense-not-found');

        const normalized = this._normalizeSpesa(
            {
                ...data.spese[i],
                ...updates,
                id: data.spese[i].id,
                creatoIl: data.spese[i].creatoIl,
                modificatoIl: new Date().toISOString()
            },
            { index: i }
        );

        if (!normalized.success) return normalized;

        data.spese[i] = normalized.spesa;

        const saved = this._save(data);
        if (!saved.success) return saved;

        return this._ok({ spesa: normalized.spesa, warnings: saved.warnings || [] });
    },

    deleteSpesa(id) {
        const current = this._loadForWrite();
        if (!current.success) return current;

        const data = current.data;
        const initialCount = data.spese.length;
        data.spese = data.spese.filter(s => s.id !== id);

        if (data.spese.length === initialCount) {
            return this._fail('Spesa non trovata.', 'expense-not-found');
        }

        const saved = this._save(data);
        if (!saved.success) return saved;

        return this._ok({ count: initialCount - data.spese.length, warnings: saved.warnings || [] });
    },

    /* --- Impostazioni --- */
    getSettings() {
        return this._clone(this._load().impostazioni);
    },

    updateSettings(updates) {
        const current = this._loadForWrite();
        if (!current.success) return current;

        const data = current.data;
        const settings = this._normalizeSettings({ ...data.impostazioni, ...updates });
        data.impostazioni = settings.value;

        const saved = this._save(data);
        if (!saved.success) return saved;

        return this._ok({ impostazioni: data.impostazioni, warnings: settings.warnings.concat(saved.warnings || []) });
    },

    /* --- Export --- */
    exportCSV() {
        const current = this._readStoredData();
        if (!current.success) return current;

        const header = [
            'id',
            'data',
            'ora',
            'importo',
            'descrizione',
            'categoria',
            'metodo',
            'tags',
            'nota',
            'creatoIl',
            'modificatoIl'
        ];

        const rows = current.data.spese.map(s => {
            const d = new Date(s.data);
            const data = d.toLocaleDateString('it-IT');
            const ora = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

            return [
                s.id,
                data,
                ora,
                s.importo.toFixed(2),
                s.descrizione || '',
                s.categoria || '',
                s.metodo || '',
                (s.tags || []).join('|'),
                s.nota || '',
                s.creatoIl || '',
                s.modificatoIl || ''
            ].map(value => this._escapeCSV(value)).join(',');
        });

        return this._ok({ content: header.join(',') + '\n' + rows.join('\n'), count: rows.length });
    },

    exportJSON() {
        const current = this._readStoredData();
        if (!current.success) return current;
        return this._ok({
            content: JSON.stringify(current.data, null, 2),
            count: current.data.spese.length
        });
    },

    /* --- Import preview / commit --- */
    previewImportJSON(jsonString) {
        let parsed;

        try {
            parsed = JSON.parse(jsonString);
        } catch (e) {
            return this._fail('JSON non leggibile.', 'invalid-json', { cause: e });
        }

        const normalized = this._normalizeData(parsed, { source: 'json' });
        if (!normalized.success) return normalized;

        return this._ok({
            format: 'json',
            data: normalized.data,
            count: normalized.data.spese.length,
            settingsIncluded: !!parsed.impostazioni,
            warnings: normalized.warnings || []
        });
    },

    previewImportCSV(csvString) {
        const parsed = this._parseCSVImport(csvString);
        if (!parsed.success) return parsed;

        return this._ok({
            format: 'csv',
            data: {
                schemaVersion: this.SCHEMA_VERSION,
                spese: parsed.spese,
                impostazioni: this._defaultSettings()
            },
            count: parsed.spese.length,
            settingsIncluded: false,
            warnings: parsed.warnings || []
        });
    },

    importJSON(jsonString, options = {}) {
        const preview = this.previewImportJSON(jsonString);
        if (!preview.success) return preview;
        return this._commitImport(preview, {
            mode: options.mode || 'replace',
            source: 'json'
        });
    },

    importCSV(csvString, options = {}) {
        const preview = this.previewImportCSV(csvString);
        if (!preview.success) return preview;
        return this._commitImport(preview, {
            mode: options.mode || 'append',
            source: 'csv'
        });
    },

    _commitImport(preview, options) {
        const mode = options.mode === 'replace' ? 'replace' : 'append';
        const current = this._loadForWrite();
        if (!current.success) return current;

        const warnings = [...(preview.warnings || [])];
        const data = current.data;
        const existingIds = mode === 'append' ? new Set(data.spese.map(s => s.id)) : new Set();
        const prepared = this._prepareImportedSpese(preview.data.spese, existingIds);
        warnings.push(...prepared.warnings);

        let nextData;
        if (mode === 'replace') {
            const snapshot = this._saveSnapshot(data, `${options.source}-replace`);
            if (!snapshot.success) return snapshot;

            nextData = {
                schemaVersion: this.SCHEMA_VERSION,
                spese: prepared.spese,
                impostazioni: options.source === 'json'
                    ? preview.data.impostazioni
                    : data.impostazioni
            };
        } else {
            if (options.source === 'json' && preview.settingsIncluded) {
                warnings.push('Le impostazioni del backup JSON sono state ignorate in modalita aggiungi.');
            }

            nextData = {
                ...data,
                spese: [...prepared.spese, ...data.spese]
            };
        }

        const saved = this._save(nextData);
        if (!saved.success) return saved;

        return this._ok({
            count: prepared.spese.length,
            mode,
            regeneratedIds: prepared.regeneratedIds,
            warnings: warnings.concat(saved.warnings || [])
        });
    },

    _prepareImportedSpese(spese, existingIds) {
        const seen = new Set(existingIds);
        const prepared = [];
        const warnings = [];
        let regeneratedIds = 0;

        spese.forEach(spesa => {
            const next = { ...spesa };
            if (!next.id || seen.has(next.id)) {
                next.id = this._uniqueId(seen);
                regeneratedIds += 1;
            }
            seen.add(next.id);
            prepared.push(next);
        });

        if (regeneratedIds > 0) {
            warnings.push(`${regeneratedIds} id duplicati o mancanti sono stati rigenerati.`);
        }

        return { spese: prepared, regeneratedIds, warnings };
    },

    /* --- Utility distruttive --- */
    clearAll() {
        const current = this._readStoredData();
        if (current.success) {
            const snapshot = this._saveSnapshot(current.data, 'clear-all');
            if (!snapshot.success) return snapshot;
        } else {
            const raw = this.getRawData();
            if (raw) {
                const snapshot = this._saveSnapshot({ raw }, 'clear-all-raw');
                if (!snapshot.success) return snapshot;
            }
        }

        try {
            localStorage.removeItem(this.KEY);
            this._setStatus(this._ok({ data: this._defaultData(), warnings: [] }));
            return this._ok();
        } catch (e) {
            return this._fail('Non sono riuscito a cancellare i dati locali.', 'clear-failed', { cause: e });
        }
    },

    getStorageSizeKB() {
        const raw = this.getRawData();
        return (raw.length * 2) / 1024;
    },

    isAvailable() {
        try {
            const t = '__test__';
            localStorage.setItem(t, t);
            localStorage.removeItem(t);
            return true;
        } catch (e) {
            return false;
        }
    },

    /* --- Normalizzazione dati --- */
    _normalizeData(raw, options = {}) {
        const warnings = [];

        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            return this._fail('Formato dati non valido: radice JSON non valida.', 'invalid-root');
        }

        const rawVersion = raw.schemaVersion == null ? 1 : Number(raw.schemaVersion);
        if (!Number.isInteger(rawVersion) || rawVersion < 1) {
            return this._fail('schemaVersion non valido.', 'invalid-schema-version');
        }

        if (rawVersion > this.SCHEMA_VERSION) {
            return this._fail(
                'Backup creato con una versione piu nuova dell app. Aggiorna l app prima di importare.',
                'future-schema-version'
            );
        }

        if (!Array.isArray(raw.spese)) {
            return this._fail('Formato dati non valido: spese deve essere un array.', 'invalid-expenses');
        }

        const settings = this._normalizeSettings(raw.impostazioni);
        warnings.push(...settings.warnings);

        const seenIds = new Set();
        const spese = [];

        for (let i = 0; i < raw.spese.length; i++) {
            const normalized = this._normalizeSpesa(raw.spese[i], { index: i });
            if (!normalized.success) {
                return this._fail(`Spesa ${i + 1}: ${normalized.error}`, normalized.code || 'invalid-expense', { warnings });
            }

            if (seenIds.has(normalized.spesa.id)) {
                normalized.spesa.id = this._stableDuplicateId(normalized.spesa.id, seenIds, i);
                warnings.push(`Spesa ${i + 1}: id duplicato rigenerato.`);
            }

            seenIds.add(normalized.spesa.id);
            spese.push(normalized.spesa);
        }

        return this._ok({
            data: {
                schemaVersion: this.SCHEMA_VERSION,
                spese,
                impostazioni: settings.value
            },
            warnings
        });
    },

    _normalizeSettings(rawSettings = {}) {
        const warnings = [];
        const defaults = this._defaultSettings();
        const raw = rawSettings && typeof rawSettings === 'object' && !Array.isArray(rawSettings)
            ? rawSettings
            : {};

        if (rawSettings && (typeof rawSettings !== 'object' || Array.isArray(rawSettings))) {
            warnings.push('Impostazioni non valide: usati i valori predefiniti.');
        }

        const tema = ['light', 'dark', 'auto'].includes(raw.tema) ? raw.tema : defaults.tema;
        const valuta = typeof raw.valuta === 'string' && raw.valuta.trim()
            ? raw.valuta.trim().slice(0, 12)
            : defaults.valuta;
        const simbolo = typeof raw.simbolo === 'string' && raw.simbolo.trim()
            ? raw.simbolo.trim().slice(0, 8)
            : defaults.simbolo;
        const ultimoBackup = raw.ultimoBackup && this._isValidDate(raw.ultimoBackup)
            ? new Date(raw.ultimoBackup).toISOString()
            : null;

        return {
            value: { tema, valuta, simbolo, ultimoBackup },
            warnings
        };
    },

    _normalizeSpesa(raw, options = {}) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            return this._fail('record non valido.', 'invalid-expense-record');
        }

        const importo = this._normalizeAmount(raw.importo);
        if (!importo.success) return importo;

        const date = this._normalizeRequiredDate(raw.data, 'data');
        if (!date.success) return date;

        const now = new Date().toISOString();
        const creatoIl = this._normalizeOptionalDate(raw.creatoIl, now);
        const modificatoIl = this._normalizeOptionalDate(raw.modificatoIl, creatoIl);
        const fallbackId = Number.isInteger(options.index) ? `legacy-${options.index + 1}` : this._uid();
        const id = typeof raw.id === 'string' && raw.id.trim()
            ? raw.id.trim()
            : fallbackId;

        return this._ok({
            spesa: {
                id,
                importo: Math.round(importo.value * 100) / 100,
                descrizione: this._cleanText(raw.descrizione, 'Spesa'),
                categoria: this._cleanText(raw.categoria, 'altro'),
                metodo: this._cleanText(raw.metodo, 'carta'),
                data: date.value,
                tags: this._normalizeTags(raw.tags),
                nota: this._cleanText(raw.nota, ''),
                creatoIl,
                modificatoIl
            }
        });
    },

    _normalizeAmount(value) {
        let amount;

        if (typeof value === 'number') {
            amount = value;
        } else if (typeof value === 'string') {
            let text = value.trim();
            text = text.replace(/\s/g, '').replace(/€/g, '').replace(/euro/gi, '');

            const lastComma = text.lastIndexOf(',');
            const lastDot = text.lastIndexOf('.');

            if (lastComma !== -1 && lastDot !== -1) {
                if (lastComma > lastDot) {
                    text = text.replace(/\./g, '').replace(',', '.');
                } else {
                    text = text.replace(/,/g, '');
                }
            } else if (lastComma !== -1) {
                text = text.replace(',', '.');
            }

            amount = Number(text);
        } else {
            return this._fail('importo mancante o non numerico.', 'invalid-amount');
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            return this._fail('importo non valido.', 'invalid-amount');
        }

        return this._ok({ value: amount });
    },

    _normalizeRequiredDate(value, fieldName) {
        if (!this._isValidDate(value)) {
            return this._fail(`${fieldName} non valida.`, 'invalid-date');
        }
        return this._ok({ value: new Date(value).toISOString() });
    },

    _normalizeOptionalDate(value, fallback) {
        if (!value || !this._isValidDate(value)) return fallback;
        return new Date(value).toISOString();
    },

    _normalizeTags(value) {
        if (!Array.isArray(value)) {
            if (typeof value === 'string' && value.trim()) {
                return value.split('|').map(tag => this._cleanTag(tag)).filter(Boolean);
            }
            return [];
        }

        const seen = new Set();
        return value
            .map(tag => this._cleanTag(tag))
            .filter(tag => {
                if (!tag || seen.has(tag)) return false;
                seen.add(tag);
                return true;
            });
    },

    _cleanText(value, fallback) {
        if (value == null) return fallback;
        const text = String(value).trim();
        return text || fallback;
    },

    _cleanTag(value) {
        return String(value || '').replace(/^#/, '').trim();
    },

    _isValidDate(value) {
        if (value == null || value === '') return false;

        if (typeof value === 'string') {
            const isoParts = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
            if (isoParts && !this._isValidDateParts(Number(isoParts[1]), Number(isoParts[2]), Number(isoParts[3]))) {
                return false;
            }
        }

        const date = new Date(value);
        return !Number.isNaN(date.getTime());
    },

    _isValidDateParts(year, month, day) {
        if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
        const date = new Date(Date.UTC(year, month - 1, day));
        return (
            date.getUTCFullYear() === year &&
            date.getUTCMonth() === month - 1 &&
            date.getUTCDate() === day
        );
    },

    /* --- CSV --- */
    _parseCSVImport(csvString) {
        const text = String(csvString || '').replace(/^\uFEFF/, '');
        if (!text.trim()) return this._fail('File CSV vuoto.', 'empty-csv');

        const delimiter = this._detectDelimiter(text);
        const rows = this._parseDelimited(text, delimiter)
            .filter(row => row.some(cell => String(cell).trim() !== ''));

        if (rows.length < 2) return this._fail('File CSV senza righe dati.', 'empty-csv');

        const headers = rows[0].map(h => this._normalizeHeader(h));
        const headerMap = {};
        headers.forEach((header, index) => {
            if (header) headerMap[header] = index;
        });

        if (headerMap.importo == null || headerMap.descrizione == null) {
            return this._fail('CSV non valido: servono almeno importo e descrizione.', 'invalid-csv-header');
        }

        const spese = [];
        const warnings = [];
        const now = new Date().toISOString();

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const rawDate = this._getCSVCell(row, headerMap, 'data');
            const rawTime = this._getCSVCell(row, headerMap, 'ora') || '12:00';
            const date = this._parseCSVDate(rawDate, rawTime);
            if (!date.success) {
                return this._fail(`Riga ${i + 1}: ${date.error}`, date.code || 'invalid-csv-date', { warnings });
            }

            const rawSpesa = {
                id: this._getCSVCell(row, headerMap, 'id') || this._uid(),
                data: date.value,
                importo: this._getCSVCell(row, headerMap, 'importo'),
                descrizione: this._getCSVCell(row, headerMap, 'descrizione') || 'Spesa',
                categoria: this._getCSVCell(row, headerMap, 'categoria') || 'altro',
                metodo: this._getCSVCell(row, headerMap, 'metodo') || 'carta',
                tags: this._getCSVCell(row, headerMap, 'tags'),
                nota: this._getCSVCell(row, headerMap, 'nota') || '',
                creatoIl: this._getCSVCell(row, headerMap, 'creatoil') || now,
                modificatoIl: this._getCSVCell(row, headerMap, 'modificatoil') || now
            };

            const normalized = this._normalizeSpesa(rawSpesa, { index: i - 1 });
            if (!normalized.success) {
                return this._fail(`Riga ${i + 1}: ${normalized.error}`, normalized.code || 'invalid-csv-row', { warnings });
            }

            spese.push(normalized.spesa);
        }

        return this._ok({ spese, warnings });
    },

    _getCSVCell(row, headerMap, name) {
        const index = headerMap[name];
        if (index == null || index >= row.length) return '';
        return String(row[index] || '').trim();
    },

    _parseCSVDate(dateText, timeText) {
        const date = String(dateText || '').trim();
        const time = String(timeText || '12:00').trim();

        if (!date) return this._fail('data mancante.', 'invalid-date');

        if (date.includes('T') && this._isValidDate(date)) {
            return this._ok({ value: new Date(date).toISOString() });
        }

        const timeMatch = time.match(/^(\d{1,2}):(\d{2})/);
        const hh = timeMatch ? timeMatch[1].padStart(2, '0') : '12';
        const mm = timeMatch ? timeMatch[2] : '00';

        let isoDate = null;
        const isoMatch = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        const itMatch = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

        if (isoMatch) {
            if (!this._isValidDateParts(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]))) {
                return this._fail('data non valida.', 'invalid-date');
            }
            isoDate = `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}T${hh}:${mm}:00`;
        } else if (itMatch) {
            if (!this._isValidDateParts(Number(itMatch[3]), Number(itMatch[2]), Number(itMatch[1]))) {
                return this._fail('data non valida.', 'invalid-date');
            }
            isoDate = `${itMatch[3]}-${itMatch[2].padStart(2, '0')}-${itMatch[1].padStart(2, '0')}T${hh}:${mm}:00`;
        }

        if (!isoDate || !this._isValidDate(isoDate)) {
            return this._fail('data non valida.', 'invalid-date');
        }

        return this._ok({ value: new Date(isoDate).toISOString() });
    },

    _detectDelimiter(text) {
        const firstLine = text.split(/\r?\n/).find(line => line.trim()) || '';
        const counts = [',', ';', '\t'].map(delimiter => ({
            delimiter,
            count: this._countDelimiterOutsideQuotes(firstLine, delimiter)
        }));

        counts.sort((a, b) => b.count - a.count);
        return counts[0].count > 0 ? counts[0].delimiter : ',';
    },

    _countDelimiterOutsideQuotes(line, delimiter) {
        let count = 0;
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"' && line[i + 1] === '"') {
                i += 1;
            } else if (ch === '"') {
                inQuotes = !inQuotes;
            } else if (ch === delimiter && !inQuotes) {
                count += 1;
            }
        }

        return count;
    },

    _parseDelimited(text, delimiter) {
        const rows = [];
        let row = [];
        let cell = '';
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            const ch = text[i];

            if (ch === '"' && inQuotes && text[i + 1] === '"') {
                cell += '"';
                i += 1;
            } else if (ch === '"') {
                inQuotes = !inQuotes;
            } else if (ch === delimiter && !inQuotes) {
                row.push(cell);
                cell = '';
            } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
                if (ch === '\r' && text[i + 1] === '\n') i += 1;
                row.push(cell);
                rows.push(row);
                row = [];
                cell = '';
            } else {
                cell += ch;
            }
        }

        row.push(cell);
        rows.push(row);
        return rows;
    },

    _normalizeHeader(value) {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace(/_/g, '');
    },

    _escapeCSV(value) {
        const text = String(value == null ? '' : value);
        if (/[",\r\n]/.test(text)) {
            return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
    },

    /* --- Utility --- */
    _clone(value) {
        return JSON.parse(JSON.stringify(value));
    },

    _uniqueId(used) {
        let id = this._uid();
        while (used.has(id)) id = this._uid();
        return id;
    },

    _stableDuplicateId(baseId, used, index) {
        const base = String(baseId || `legacy-${index + 1}`).trim() || `legacy-${index + 1}`;
        let candidate = `${base}-dup-${index + 1}`;
        let counter = 2;

        while (used.has(candidate)) {
            candidate = `${base}-dup-${index + 1}-${counter}`;
            counter += 1;
        }

        return candidate;
    },

    _uid() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    }
};
