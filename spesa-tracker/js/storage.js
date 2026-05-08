/* ============================================
   STORAGE — Gestione dati in localStorage
   ============================================ */

const Storage = {
    KEY: (
        typeof window !== 'undefined' &&
        window.SPESA_TRACKER_CONFIG &&
        window.SPESA_TRACKER_CONFIG.storageKey
    ) || 'spesa-tracker-data',

    /* --- Struttura dati predefinita --- */
    _defaultData() {
        return {
            spese: [],
            impostazioni: {
                tema: 'auto',
                valuta: 'EUR',
                simbolo: '€',
                ultimoBackup: null
            }
        };
    },

    /* --- Lettura / Scrittura --- */
    _load() {
        try {
            const raw = localStorage.getItem(this.KEY);
            if (!raw) return this._defaultData();
            const data = JSON.parse(raw);
            // assicura che le proprietà esistano
            if (!data.spese) data.spese = [];
            if (!data.impostazioni) data.impostazioni = this._defaultData().impostazioni;
            return data;
        } catch (e) {
            console.error('Errore caricamento dati:', e);
            return this._defaultData();
        }
    },

    _save(data) {
        try {
            localStorage.setItem(this.KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Errore salvataggio:', e);
            alert('Errore nel salvataggio! Lo spazio potrebbe essere esaurito. Esporta i dati.');
            return false;
        }
    },

    /* --- CRUD Spese --- */
    getSpese() {
        return this._load().spese;
    },

    addSpesa(spesa) {
        const data = this._load();
        spesa.id = this._uid();
        spesa.creatoIl = new Date().toISOString();
        spesa.modificatoIl = spesa.creatoIl;
        data.spese.unshift(spesa);
        this._save(data);
        return spesa;
    },

    updateSpesa(id, updates) {
        const data = this._load();
        const i = data.spese.findIndex(s => s.id === id);
        if (i === -1) return null;
        data.spese[i] = { ...data.spese[i], ...updates, modificatoIl: new Date().toISOString() };
        this._save(data);
        return data.spese[i];
    },

    deleteSpesa(id) {
        const data = this._load();
        data.spese = data.spese.filter(s => s.id !== id);
        this._save(data);
    },

    /* --- Impostazioni --- */
    getSettings() {
        return this._load().impostazioni;
    },

    updateSettings(updates) {
        const data = this._load();
        data.impostazioni = { ...data.impostazioni, ...updates };
        this._save(data);
    },

    /* --- Export --- */
    exportCSV() {
        const spese = this.getSpese();
        const header = 'data,ora,importo,descrizione,categoria,metodo,nota';
        const rows = spese.map(s => {
            const d = new Date(s.data);
            const data = d.toLocaleDateString('it-IT');
            const ora = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
            const desc = '"' + (s.descrizione || '').replace(/"/g, '""') + '"';
            const nota = '"' + (s.nota || '').replace(/"/g, '""') + '"';
            return [data, ora, s.importo.toFixed(2), desc, s.categoria || '', s.metodo || '', nota].join(',');
        });
        return header + '\n' + rows.join('\n');
    },

    exportJSON() {
        return JSON.stringify(this._load(), null, 2);
    },

    /* --- Import --- */
    importJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (!data.spese || !Array.isArray(data.spese)) throw new Error('Formato JSON non valido');
            this._save(data);
            return { success: true, count: data.spese.length };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    importCSV(csvString) {
        try {
            const lines = csvString.replace(/^\uFEFF/, '').trim().split('\n');
            if (lines.length < 2) throw new Error('File vuoto');
            const spese = [];
            for (let i = 1; i < lines.length; i++) {
                const parts = this._parseCSVLine(lines[i]);
                if (parts.length < 4) continue;
                const dateParts = parts[0].trim().split('/');
                let dateISO;
                if (dateParts.length === 3) {
                    const [dd, mm, yyyy] = dateParts;
                    const time = parts[1] ? parts[1].trim() : '12:00';
                    dateISO = `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}T${time}:00`;
                } else {
                    dateISO = new Date().toISOString();
                }
                spese.push({
                    id: this._uid(),
                    data: dateISO,
                    importo: parseFloat(parts[2]) || 0,
                    descrizione: parts[3].replace(/^"|"$/g, '').replace(/""/g, '"'),
                    categoria: parts[4] ? parts[4].trim() : 'altro',
                    metodo: parts[5] ? parts[5].trim() : 'carta',
                    nota: parts[6] ? parts[6].replace(/^"|"$/g, '').replace(/""/g, '"') : '',
                    tags: [],
                    creatoIl: new Date().toISOString(),
                    modificatoIl: new Date().toISOString()
                });
            }
            const data = this._load();
            data.spese = [...spese, ...data.spese];
            this._save(data);
            return { success: true, count: spese.length };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    _parseCSVLine(line) {
        const result = [];
        let cur = '';
        let inQ = false;
        for (const ch of line) {
            if (ch === '"') { inQ = !inQ; }
            else if (ch === ',' && !inQ) { result.push(cur); cur = ''; }
            else { cur += ch; }
        }
        result.push(cur);
        return result;
    },

    /* --- Utility --- */
    clearAll() {
        localStorage.removeItem(this.KEY);
    },

    getStorageSizeKB() {
        const raw = localStorage.getItem(this.KEY) || '';
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

    _uid() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    }
};
