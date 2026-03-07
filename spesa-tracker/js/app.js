/* ============================================
   APP — Logica principale dell'applicazione
   ============================================ */

const App = {

    currentPage: 'timeline',
    editingId: null,
    statsPeriod: 'month',
    toastTimer: null,
    newCardId: null,  // per animazione

    /* =====================
       INIZIALIZZAZIONE
       ===================== */
    init() {
        if (!Storage.isAvailable()) {
            document.body.innerHTML = '<div style="padding:40px;text-align:center"><h2>⚠️ Storage non disponibile</h2><p>Il tuo browser non supporta localStorage. Prova con un altro browser.</p></div>';
            return;
        }

        this.initTheme();
        this.initNavigation();
        this.initInput();
        this.initModal();
        this.populateDropdowns();
        this.renderTimeline();
    },

    /* =====================
       TEMA
       ===================== */
    initTheme() {
        const saved = Storage.getSettings().tema || 'auto';
        this.applyTheme(saved);

        document.getElementById('theme-toggle').addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            this.applyTheme(next);
            Storage.updateSettings({ tema: next });
            if (this.currentPage === 'settings') this.renderSettings();
        });

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (Storage.getSettings().tema === 'auto') this.applyTheme('auto');
        });
    },

    applyTheme(theme) {
        if (theme === 'auto') {
            const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
    },

    /* =====================
       NAVIGAZIONE
       ===================== */
    initNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.navigateTo(btn.dataset.page);
            });
        });
    },

    navigateTo(page) {
        this.currentPage = page;

        // Pagine
        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
        document.getElementById('page-' + page).classList.remove('hidden');

        // Nav attiva
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.nav-btn[data-page="${page}"]`).classList.add('active');

        // Input bar solo su timeline
        const inputBar = document.getElementById('input-bar');
        const main = document.getElementById('app-main');
        if (page === 'timeline') {
            inputBar.classList.remove('hidden');
            main.classList.remove('no-input-bar');
        } else {
            inputBar.classList.add('hidden');
            main.classList.add('no-input-bar');
        }

        // Render pagine
        if (page === 'stats') this.renderStats();
        if (page === 'settings') this.renderSettings();
    },

    /* =====================
       INPUT SPESE
       ===================== */
    initInput() {
        const input = document.getElementById('expense-input');
        const btnSend = document.getElementById('btn-send');
        const btnVoice = document.getElementById('btn-voice');

        btnSend.addEventListener('click', () => this.submitExpense());
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.submitExpense();
        });

        // Dettatura vocale
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'it-IT';
            this.recognition.continuous = false;
            this.recognition.interimResults = false;

            this.recognition.onresult = (e) => {
                const text = e.results[0][0].transcript;
                input.value = text;
                btnVoice.classList.remove('recording');
                this.submitExpense();
            };

            this.recognition.onerror = () => {
                btnVoice.classList.remove('recording');
                this.showToast('Non ho capito. Riprova.', 'error');
            };

            this.recognition.onend = () => {
                btnVoice.classList.remove('recording');
            };

            btnVoice.addEventListener('click', () => {
                if (btnVoice.classList.contains('recording')) {
                    this.recognition.stop();
                } else {
                    btnVoice.classList.add('recording');
                    this.recognition.start();
                }
            });
        } else {
            btnVoice.style.display = 'none';
        }
    },

    submitExpense() {
        const input = document.getElementById('expense-input');
        const text = input.value.trim();
        if (!text) return;

        const parsed = Parser.parse(text);
        if (!parsed) {
            this.showToast('Non ho capito l\'importo. Prova: "caffè 1.50"', 'error');
            return;
        }

        const spesa = Storage.addSpesa(parsed);
        this.newCardId = spesa.id;
        input.value = '';
        this.renderTimeline();

        const cat = this.getCat(spesa.categoria);
        this.showToast(`${cat.emoji} ${spesa.descrizione} · €${spesa.importo.toFixed(2)}`, 'success');
    },

    /* =====================
       TIMELINE
       ===================== */
    renderTimeline() {
        const spese = Storage.getSpese();
        const content = document.getElementById('timeline-content');
        const empty = document.getElementById('timeline-empty');
        const summary = document.getElementById('timeline-summary');

        if (spese.length === 0) {
            content.innerHTML = '';
            summary.innerHTML = '';
            empty.classList.remove('hidden');
            return;
        }

        empty.classList.add('hidden');

        // Summary
        const oggi = new Date();
        const oggiKey = this.dateKey(oggi);
        const meseCorrente = oggi.getMonth();
        const annoCorrente = oggi.getFullYear();

        let totOggi = 0, totMese = 0;
        spese.forEach(s => {
            const d = new Date(s.data);
            if (this.dateKey(d) === oggiKey) totOggi += s.importo;
            if (d.getMonth() === meseCorrente && d.getFullYear() === annoCorrente) totMese += s.importo;
        });

        const nomeMese = oggi.toLocaleDateString('it-IT', { month: 'long' });

        summary.innerHTML = `
            <div class="summary-row">
                <div class="summary-item">
                    <div class="summary-label">Oggi</div>
                    <div class="summary-value">€${totOggi.toFixed(2)}</div>
                </div>
                <div class="summary-divider"></div>
                <div class="summary-item">
                    <div class="summary-label">${nomeMese}</div>
                    <div class="summary-value">€${totMese.toFixed(2)}</div>
                </div>
                <div class="summary-divider"></div>
                <div class="summary-item">
                    <div class="summary-label">N. spese</div>
                    <div class="summary-value">${spese.length}</div>
                </div>
            </div>
        `;

        // Raggruppa per giorno
        const groups = this.groupByDay(spese);

        content.innerHTML = groups.map(g => {
            const dayTotal = g.spese.reduce((s, x) => s + x.importo, 0);
            const cards = g.spese.map(s => this.createCard(s)).join('');

            return `
                <div class="day-group">
                    <div class="day-header">
                        <span class="day-date">${this.formatDayLabel(g.date)}</span>
                        <span class="day-total">€${dayTotal.toFixed(2)}</span>
                    </div>
                    ${cards}
                </div>
            `;
        }).join('');

        // Aggiunge listener click per modifica
        content.querySelectorAll('.expense-card').forEach(card => {
            card.addEventListener('click', () => {
                this.openEditModal(card.dataset.id);
            });
        });
    },

    createCard(s) {
        const cat = this.getCat(s.categoria);
        const met = this.getMet(s.metodo);
        const d = new Date(s.data);
        const ora = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        const isNew = s.id === this.newCardId;
        if (isNew) this.newCardId = null;

        return `
            <div class="expense-card${isNew ? ' new-card' : ''}" data-id="${s.id}">
                <div class="expense-emoji">${cat.emoji}</div>
                <div class="expense-info">
                    <div class="expense-desc">${this.esc(s.descrizione)}</div>
                    <div class="expense-meta">
                        <span>${cat.nome}</span>
                        <span class="dot"></span>
                        <span>${met.emoji}</span>
                        <span class="dot"></span>
                        <span>${ora}</span>
                        ${s.nota ? '<span class="dot"></span><span>📝</span>' : ''}
                    </div>
                </div>
                <div class="expense-amount">€${s.importo.toFixed(2)}</div>
            </div>
        `;
    },

    /* =====================
       MODAL MODIFICA
       ===================== */
    initModal() {
        document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'modal-overlay') this.closeModal();
        });
        document.getElementById('btn-save').addEventListener('click', () => this.saveEdit());
        document.getElementById('btn-delete').addEventListener('click', () => {
            this.showConfirm('Eliminare questa spesa?', () => {
                Storage.deleteSpesa(this.editingId);
                this.closeModal();
                this.renderTimeline();
                this.showToast('Spesa eliminata', 'info');
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeConfirm();
            }
        });
    },

    populateDropdowns() {
        const catSel = document.getElementById('edit-categoria');
        catSel.innerHTML = CATEGORIES.map(c =>
            `<option value="${c.id}">${c.emoji} ${c.nome}</option>`
        ).join('');

        const metSel = document.getElementById('edit-metodo');
        metSel.innerHTML = PAYMENT_METHODS.map(m =>
            `<option value="${m.id}">${m.emoji} ${m.nome}</option>`
        ).join('');
    },

    openEditModal(id) {
        const spesa = Storage.getSpese().find(s => s.id === id);
        if (!spesa) return;

        this.editingId = id;
        const d = new Date(spesa.data);

        document.getElementById('edit-importo').value = spesa.importo;
        document.getElementById('edit-descrizione').value = spesa.descrizione;
        document.getElementById('edit-categoria').value = spesa.categoria;
        document.getElementById('edit-metodo').value = spesa.metodo || 'carta';
        document.getElementById('edit-data').value = this.toInputDate(d);
        document.getElementById('edit-ora').value = this.toInputTime(d);
        document.getElementById('edit-nota').value = spesa.nota || '';

        document.getElementById('modal-overlay').classList.remove('hidden');
    },

    closeModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
        this.editingId = null;
    },

    saveEdit() {
        const dateVal = document.getElementById('edit-data').value;
        const timeVal = document.getElementById('edit-ora').value;
        const importo = parseFloat(document.getElementById('edit-importo').value);

        if (!importo || importo <= 0) {
            this.showToast('Inserisci un importo valido', 'error');
            return;
        }

        const dateTime = new Date(`${dateVal}T${timeVal || '12:00'}:00`);

        Storage.updateSpesa(this.editingId, {
            importo: Math.round(importo * 100) / 100,
            descrizione: document.getElementById('edit-descrizione').value || 'Spesa',
            categoria: document.getElementById('edit-categoria').value,
            metodo: document.getElementById('edit-metodo').value,
            data: dateTime.toISOString(),
            nota: document.getElementById('edit-nota').value
        });

        this.closeModal();
        this.renderTimeline();
        this.showToast('Spesa modificata ✓', 'success');
    },

    /* =====================
       CONFERMA ELIMINAZIONE
       ===================== */
    showConfirm(msg, onYes) {
        document.getElementById('confirm-message').textContent = msg;
        document.getElementById('confirm-overlay').classList.remove('hidden');

        const yesBtn = document.getElementById('confirm-yes');
        const noBtn = document.getElementById('confirm-no');

        const cleanup = () => {
            this.closeConfirm();
            yesBtn.replaceWith(yesBtn.cloneNode(true));
            noBtn.replaceWith(noBtn.cloneNode(true));
        };

        // Clona per evitare listener duplicati
        const newYes = yesBtn.cloneNode(true);
        const newNo = noBtn.cloneNode(true);
        yesBtn.replaceWith(newYes);
        noBtn.replaceWith(newNo);

        newYes.addEventListener('click', () => { cleanup(); onYes(); });
        newNo.addEventListener('click', () => cleanup());
    },

    closeConfirm() {
        document.getElementById('confirm-overlay').classList.add('hidden');
    },

    /* =====================
       STATISTICHE
       ===================== */
    renderStats() {
        const container = document.getElementById('stats-content');
        const spese = Storage.getSpese();

        if (spese.length === 0) {
            container.innerHTML = '<div class="stats-empty">📊<br>Aggiungi qualche spesa per vedere le statistiche</div>';
            return;
        }

        const now = new Date();
        let start, periodLabel;

        switch (this.statsPeriod) {
            case 'week':
                start = new Date(now);
                start.setDate(now.getDate() - 6);
                start.setHours(0, 0, 0, 0);
                periodLabel = 'Ultimi 7 giorni';
                break;
            case 'year':
                start = new Date(now.getFullYear(), 0, 1);
                periodLabel = now.getFullYear().toString();
                break;
            default: // month
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                periodLabel = now.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
        }

        const filtered = spese.filter(s => new Date(s.data) >= start);
        const total = filtered.reduce((s, x) => s + x.importo, 0);
        const days = Math.max(1, Math.ceil((now - start) / 86400000));
        const avg = total / days;

        // Per categoria
        const byCat = {};
        filtered.forEach(s => {
            byCat[s.categoria] = (byCat[s.categoria] || 0) + s.importo;
        });
        const catSorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
        const maxCat = catSorted.length > 0 ? catSorted[0][1] : 1;

        // Top spese
        const topSpese = [...filtered].sort((a, b) => b.importo - a.importo).slice(0, 5);

        container.innerHTML = `
            <div class="stats-period-selector">
                <button class="period-btn ${this.statsPeriod === 'week' ? 'active' : ''}" data-period="week">Settimana</button>
                <button class="period-btn ${this.statsPeriod === 'month' ? 'active' : ''}" data-period="month">Mese</button>
                <button class="period-btn ${this.statsPeriod === 'year' ? 'active' : ''}" data-period="year">Anno</button>
            </div>

            <div class="stats-cards">
                <div class="stat-card">
                    <div class="stat-card-value">€${total.toFixed(2)}</div>
                    <div class="stat-card-label">Totale</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-value">€${avg.toFixed(2)}</div>
                    <div class="stat-card-label">Media/giorno</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-value">${filtered.length}</div>
                    <div class="stat-card-label">Spese</div>
                </div>
            </div>

            <div class="stats-section">
                <div class="stats-section-title">📂 Per categoria</div>
                ${catSorted.map(([catId, amount]) => {
                    const cat = this.getCat(catId);
                    const pct = total > 0 ? ((amount / total) * 100).toFixed(0) : 0;
                    const barW = ((amount / maxCat) * 100).toFixed(1);
                    return `
                        <div class="cat-bar-item">
                            <div class="cat-bar-header">
                                <span class="cat-bar-name">${cat.emoji} ${cat.nome}</span>
                                <span class="cat-bar-amount">€${amount.toFixed(2)} (${pct}%)</span>
                            </div>
                            <div class="cat-bar-track">
                                <div class="cat-bar-fill" style="width:${barW}%"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            ${topSpese.length > 0 ? `
                <div class="stats-section">
                    <div class="stats-section-title">🏆 Top 5 spese</div>
                    ${topSpese.map((s, i) => {
                        const cat = this.getCat(s.categoria);
                        const d = new Date(s.data);
                        return `
                            <div class="expense-card" data-id="${s.id}" style="cursor:default">
                                <div class="expense-emoji">${cat.emoji}</div>
                                <div class="expense-info">
                                    <div class="expense-desc">${this.esc(s.descrizione)}</div>
                                    <div class="expense-meta">
                                        <span>${d.toLocaleDateString('it-IT', { day:'numeric', month:'short' })}</span>
                                    </div>
                                </div>
                                <div class="expense-amount">€${s.importo.toFixed(2)}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : ''}
        `;

        // Listener bottoni periodo
        container.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.statsPeriod = btn.dataset.period;
                this.renderStats();
            });
        });
    },

    /* =====================
       IMPOSTAZIONI
       ===================== */
    renderSettings() {
        const settings = Storage.getSettings();
        const spese = Storage.getSpese();
        const sizeKB = Storage.getStorageSizeKB();
        const container = document.getElementById('settings-content');

        let dateRange = '—';
        if (spese.length > 0) {
            const dates = spese.map(s => new Date(s.data)).sort((a,b) => a - b);
            const prima = dates[0].toLocaleDateString('it-IT');
            const ultima = dates[dates.length - 1].toLocaleDateString('it-IT');
            dateRange = `${prima} — ${ultima}`;
        }

        container.innerHTML = `
            <div class="settings-section">
                <h3>🎨 Tema</h3>
                <div class="theme-selector">
                    <button class="theme-btn ${settings.tema === 'light' ? 'active' : ''}" data-theme="light">☀️ Chiaro</button>
                    <button class="theme-btn ${settings.tema === 'dark' ? 'active' : ''}" data-theme="dark">🌙 Scuro</button>
                    <button class="theme-btn ${settings.tema === 'auto' ? 'active' : ''}" data-theme="auto">🌓 Auto</button>
                </div>
            </div>

            <div class="settings-section">
                <h3>📤 Esporta dati</h3>
                <p class="settings-hint">Scarica una copia dei tuoi dati. Il formato JSON è consigliato per il backup completo, il CSV è ideale per Excel/Sheets.</p>
                <div class="settings-buttons">
                    <button id="btn-export-json" class="btn btn-secondary">📋 JSON</button>
                    <button id="btn-export-csv" class="btn btn-secondary">📄 CSV</button>
                </div>
            </div>

            <div class="settings-section">
                <h3>📥 Importa dati</h3>
                <p class="settings-hint">Ripristina da un backup JSON o importa un file CSV. I dati importati si aggiungono a quelli esistenti (CSV) o li sostituiscono (JSON).</p>
                <input type="file" id="import-file" accept=".json,.csv" hidden>
                <button id="btn-import" class="btn btn-secondary btn-block">📁 Scegli file...</button>
            </div>

            <div class="settings-section">
                <h3>📊 Informazioni</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">Spese registrate</span>
                        <span class="info-value">${spese.length}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Periodo</span>
                        <span class="info-value">${dateRange}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Spazio usato</span>
                        <span class="info-value">${sizeKB.toFixed(1)} KB</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Spazio disponibile</span>
                        <span class="info-value">~5 MB</span>
                    </div>
                </div>
            </div>

            <div class="settings-section danger-zone">
                <h3>⚠️ Zona pericolosa</h3>
                <p class="settings-hint">Questa azione è irreversibile. Esporta prima i tuoi dati!</p>
                <button id="btn-clear-all" class="btn btn-danger btn-block">🗑️ Cancella tutti i dati</button>
            </div>

            <div class="about-section">
                <p>💰 SpesaTracker v1.0</p>
                <p>Dati salvati localmente nel browser</p>
                <p>Nessun server · Nessun tracciamento · Nessun costo</p>
            </div>
        `;

        // --- Event listeners ---

        // Tema
        container.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.applyTheme(btn.dataset.theme);
                Storage.updateSettings({ tema: btn.dataset.theme });
                this.renderSettings();
            });
        });

        // Export JSON
        container.querySelector('#btn-export-json').addEventListener('click', () => {
            const json = Storage.exportJSON();
            this.download(json, `spese_backup_${this.dateStamp()}.json`, 'application/json');
            this.showToast('Backup JSON scaricato ✓', 'success');
        });

        // Export CSV
        container.querySelector('#btn-export-csv').addEventListener('click', () => {
            const csv = '\uFEFF' + Storage.exportCSV(); // BOM per Excel
            this.download(csv, `spese_${this.dateStamp()}.csv`, 'text/csv;charset=utf-8');
            this.showToast('File CSV scaricato ✓', 'success');
        });

        // Import
        const fileInput = container.querySelector('#import-file');
        container.querySelector('#btn-import').addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                const content = ev.target.result;
                let result;

                if (file.name.endsWith('.json')) {
                    this.showConfirm('Importare il backup JSON? I dati attuali verranno SOSTITUITI.', () => {
                        result = Storage.importJSON(content);
                        if (result.success) {
                            this.showToast(`Importate ${result.count} spese ✓`, 'success');
                            this.renderTimeline();
                            this.renderSettings();
                        } else {
                            this.showToast('Errore: ' + result.error, 'error');
                        }
                    });
                } else if (file.name.endsWith('.csv')) {
                    result = Storage.importCSV(content);
                    if (result.success) {
                        this.showToast(`Importate ${result.count} spese da CSV ✓`, 'success');
                        this.renderTimeline();
                        this.renderSettings();
                    } else {
                        this.showToast('Errore: ' + result.error, 'error');
                    }
                } else {
                    this.showToast('Formato non supportato. Usa .json o .csv', 'error');
                }

                fileInput.value = '';
            };
            reader.readAsText(file);
        });

        // Clear all
        container.querySelector('#btn-clear-all').addEventListener('click', () => {
            this.showConfirm('Eliminare TUTTI i dati? Questa azione è irreversibile!', () => {
                Storage.clearAll();
                this.renderTimeline();
                this.renderSettings();
                this.showToast('Tutti i dati eliminati', 'info');
            });
        });
    },

    /* =====================
       TOAST
       ===================== */
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'toast ' + type;

        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => {
            toast.classList.add('hidden');
        }, 2800);
    },

    /* =====================
       HELPER
       ===================== */
    getCat(id) {
        return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
    },

    getMet(id) {
        return PAYMENT_METHODS.find(m => m.id === id) || PAYMENT_METHODS[0];
    },

    groupByDay(spese) {
        const groups = {};
        spese.forEach(s => {
            const key = this.dateKey(new Date(s.data));
            if (!groups[key]) groups[key] = [];
            groups[key].push(s);
        });
        return Object.keys(groups)
            .sort().reverse()
            .map(date => ({
                date,
                spese: groups[date].sort((a, b) => new Date(b.data) - new Date(a.data))
            }));
    },

    dateKey(d) {
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    },

    formatDayLabel(dateKey) {
        const oggi = this.dateKey(new Date());
        const ieri = this.dateKey(new Date(Date.now() - 86400000));

        if (dateKey === oggi) return '📌 Oggi';
        if (dateKey === ieri) return 'Ieri';

        const d = new Date(dateKey + 'T12:00:00');
        return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
    },

    toInputDate(d) {
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    },

    toInputTime(d) {
        return String(d.getHours()).padStart(2, '0') + ':' +
            String(d.getMinutes()).padStart(2, '0');
    },

    dateStamp() {
        return this.dateKey(new Date());
    },

    download(content, filename, mime) {
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    esc(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

/* --- Avvio --- */
document.addEventListener('DOMContentLoaded', () => App.init());