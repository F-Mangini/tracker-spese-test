/* ============================================
   CHART COLORS
   ============================================ */
const CHART_COLORS = [
    '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1',
    '#14b8a6', '#e11d48', '#0ea5e9', '#a855f7', '#eab308',
    '#22c55e', '#d946ef', '#64748b', '#fb923c', '#2dd4bf'
];

/* ============================================
   APP
   ============================================ */
const App = {
    currentPage: 'timeline',
    editingId: null,
    toastTimer: null,
    newCardId: null,

    /* --- Stats --- */
    statsPeriod: 'month',
    statsOffset: 0,
    chartDoughnut: null,
    chartBar: null,

    /* --- Filters (shared across pages) --- */
    filterOpen: false,
    filters: {
        query: '',
        categories: new Set(),
        methods: new Set(),
        amountMin: 0,
        amountMax: Infinity,
        dateFrom: '',
        dateTo: ''
    },
    sliderMax: 100,
    _lastSliderInput: 'max',
    advancedFiltersOpen: false,
    _filterSearchActive: false,

    /* --- Edit modal history/focus --- */
    _modalInteractionActive: false,
    _suppressNextPopstate: false,
    _suspendInteractionRelease: false,
    _keyboardWatchTimer: null,
    _expenseInputActive: false,
    _lastViewportHeight: 0,

    /* =====================
       INIT
       ===================== */
    init() {
        if (!Storage.isAvailable()) {
            document.body.innerHTML = '<div style="padding:40px;text-align:center"><h2>⚠️ Storage non disponibile</h2></div>';
            return;
        }

        this.initTheme();
        this.initNavigation();
        this.initInput();
        this.initModal();
        this.initFilters();
        this.populateDropdowns();
        this.renderTimeline();
    },

    /* =====================
       THEME
       ===================== */
    initTheme() {
        const saved = Storage.getSettings().tema || 'auto';
        this.applyTheme(saved);

        document.getElementById('theme-toggle').addEventListener('click', () => {
            const cur = document.documentElement.getAttribute('data-theme');
            const next = cur === 'dark' ? 'light' : 'dark';

            this.applyTheme(next);

            if (this.currentPage === 'stats') this.renderStats();
        });
    },

    applyTheme(theme) {
        if (theme === 'auto') {
            document.documentElement.setAttribute(
                'data-theme',
                window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
            );
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
    },

    /* =====================
       NAVIGATION
       ===================== */
    initNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.navigateTo(btn.dataset.page));
        });
    },

    navigateTo(page, fromPopstate = false) {
        if (!fromPopstate && page !== 'timeline') {
            if (this.currentPage === 'timeline') {
                try { history.pushState({ page: page }, ''); } catch (_) {}
            } else {
                try { history.replaceState({ page: page }, ''); } catch (_) {}
            }
        } else if (!fromPopstate && page === 'timeline' && this.currentPage !== 'timeline') {
            this._suppressNextPopstate = true;
            try { history.back(); } catch (_) { }
        }

        this.currentPage = page;

        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
        document.getElementById('page-' + page).classList.remove('hidden');

        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.nav-btn[data-page="${page}"]`).classList.add('active');

        const inputBar = document.getElementById('input-bar');
        const main = document.getElementById('app-main');

        if (page === 'timeline') {
            inputBar.classList.remove('hidden');
            main.classList.remove('no-input-bar');
        } else {
            inputBar.classList.add('hidden');
            main.classList.add('no-input-bar');
        }

        document.getElementById('btn-filter-toggle').style.display =
            page === 'settings' ? 'none' : '';

        if (page === 'settings' && this.filterOpen) this.closeFilterPanel();

        if (page === 'timeline') this.renderTimeline();
        if (page === 'stats') this.renderStats();
        if (page === 'settings') this.renderSettings();
    },

    /* =====================
       FILTER PANEL
       ===================== */
    initFilters() {
        const toggleBtn = document.getElementById('btn-filter-toggle');
        const searchInput = document.getElementById('search-input');
        const clearBtn = document.getElementById('btn-search-clear');
        const resetBtn = document.getElementById('btn-filter-reset');
        const dateFrom = document.getElementById('filter-date-from');
        const dateTo = document.getElementById('filter-date-to');

        if (dateFrom) this.bindNonStickyNativePicker(dateFrom);
        if (dateTo) this.bindNonStickyNativePicker(dateTo);

        toggleBtn.addEventListener('click', () => {
            if (this.filterOpen) this.closeFilterPanel();
            else this.openFilterPanel();
        });

        searchInput.addEventListener('input', () => {
            this.filters.query = searchInput.value.trim();
            clearBtn.classList.toggle('hidden', !this.filters.query);
            this.onFilterChange();
        });

        searchInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchInput.blur();
            }
        });

        searchInput.addEventListener('focus', () => {
            if (this.filterOpen && !this._filterSearchActive) {
                this._filterSearchActive = true;
                try { history.pushState({ panel: 'filter-search' }, ''); } catch (_) { }
            }
        });

        searchInput.addEventListener('blur', () => {
            if (this._filterSearchActive) {
                this._filterSearchActive = false;
                this._suppressNextPopstate = true;
                try { history.back(); } catch (_) { }
            }
        });

        const handleClear = (e) => {
            if (e && e.cancelable) e.preventDefault();
            if (searchInput.value === '') return;
            searchInput.value = '';
            this.filters.query = '';
            clearBtn.classList.add('hidden');
            this.onFilterChange();
        };

        clearBtn.addEventListener('mousedown', handleClear);
        clearBtn.addEventListener('touchstart', handleClear, { passive: false });
        clearBtn.addEventListener('click', handleClear);

        this.buildChips('filter-cats', CATEGORIES, this.filters.categories);
        this.buildChips('filter-methods', PAYMENT_METHODS, this.filters.methods);

        this.initSlider();

        dateFrom.addEventListener('change', () => {
            dateFrom.classList.remove('picker-open');
            this.filters.dateFrom = dateFrom.value;
            this.onFilterChange();
            setTimeout(() => {
                if (document.activeElement === dateFrom) {
                    try { dateFrom.blur(); } catch (_) { }
                }
            }, 0);
        });

        dateTo.addEventListener('change', () => {
            dateTo.classList.remove('picker-open');
            this.filters.dateTo = dateTo.value;
            this.onFilterChange();
            setTimeout(() => {
                if (document.activeElement === dateTo) {
                    try { dateTo.blur(); } catch (_) { }
                }
            }, 0);
        });

        resetBtn.addEventListener('click', () => this.resetFilters());

        const advToggle = document.getElementById('btn-advanced-toggle');
        advToggle.addEventListener('click', () => this.toggleAdvancedFilters());

        this.syncFilterUI();
        this.updateFilterBadge();
    },

    toggleAdvancedFilters() {
        this.advancedFiltersOpen = !this.advancedFiltersOpen;
        const section = document.getElementById('advanced-filters');
        const btn = document.getElementById('btn-advanced-toggle');

        if (this.advancedFiltersOpen) {
            section.classList.remove('hidden');
            btn.classList.add('active');
            document.body.classList.add('no-scroll');
            history.pushState({ panel: 'advanced-filters' }, '');
        } else {
            section.classList.add('hidden');
            btn.classList.remove('active');
            document.body.classList.remove('no-scroll');
        }

        requestAnimationFrame(() => {
            const panel = document.getElementById('filter-panel');
            const h = panel.offsetHeight;
            document.getElementById('app-main').style.marginTop = `calc(var(--header-h) + ${h}px)`;

            if (this.advancedFiltersOpen) {
                const scrollContainer = panel.querySelector('.filter-panel-scroll');
                scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
            }
        });
    },

    buildChips(containerId, items, targetSet) {
        const container = document.getElementById(containerId);

        container.innerHTML = items.map(item =>
            `<button class="filter-chip" data-id="${item.id}">${item.emoji} ${item.nome}</button>`
        ).join('');

        container.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const id = chip.dataset.id;

                if (targetSet.has(id)) {
                    targetSet.delete(id);
                    chip.classList.remove('active');
                } else {
                    targetSet.add(id);
                    chip.classList.add('active');
                }

                this.onFilterChange();
            });
        });
    },

    syncFilterUI() {
        document.getElementById('search-input').value = this.filters.query;
        document.getElementById('btn-search-clear').classList.toggle('hidden', !this.filters.query);
        document.getElementById('filter-date-from').value = this.filters.dateFrom;
        document.getElementById('filter-date-to').value = this.filters.dateTo;

        document.querySelectorAll('#filter-cats .filter-chip').forEach(chip => {
            chip.classList.toggle('active', this.filters.categories.has(chip.dataset.id));
        });

        document.querySelectorAll('#filter-methods .filter-chip').forEach(chip => {
            chip.classList.toggle('active', this.filters.methods.has(chip.dataset.id));
        });

        this.recalcSliderMax();
    },

    /* --- Dual Range Slider --- */
    initSlider() {
        this.recalcSliderMax();

        const sMin = document.getElementById('slider-min');
        const sMax = document.getElementById('slider-max');

        const update = () => {
            let lo = Number(sMin.value);
            let hi = Number(sMax.value);

            if (lo > hi) {
                if (this._lastSliderInput === 'min') {
                    sMin.value = String(hi);
                    lo = hi;
                } else {
                    sMax.value = String(lo);
                    hi = lo;
                }
            }

            this.filters.amountMin = lo;
            this.filters.amountMax = hi >= this.sliderMax ? Infinity : hi;

            this.updateSliderUI(lo, hi);
            this.onFilterChange();
        };

        sMin.addEventListener('input', () => {
            this._lastSliderInput = 'min';
            update();
        });

        sMax.addEventListener('input', () => {
            this._lastSliderInput = 'max';
            update();
        });
    },

    recalcSliderMax() {
        const spese = Storage.getSpese();

        if (spese.length === 0) {
            this.sliderMax = 100;
        } else {
            const mx = Math.max(...spese.map(s => Number(s.importo) || 0));

            if (mx <= 5) this.sliderMax = 10;
            else if (mx <= 10) this.sliderMax = 25;
            else if (mx <= 25) this.sliderMax = 50;
            else if (mx <= 50) this.sliderMax = 100;
            else if (mx <= 100) this.sliderMax = 200;
            else if (mx <= 250) this.sliderMax = 500;
            else if (mx <= 500) this.sliderMax = 750;
            else if (mx <= 1000) this.sliderMax = 1500;
            else this.sliderMax = Math.ceil(mx / 500) * 500 + 500;
        }

        const sMin = document.getElementById('slider-min');
        const sMax = document.getElementById('slider-max');

        if (!sMin || !sMax) return;

        sMin.max = String(this.sliderMax);
        sMax.max = String(this.sliderMax);

        const hadInfinity = this.filters.amountMax === Infinity;

        let lo = Number.isFinite(this.filters.amountMin) ? this.filters.amountMin : 0;
        let hi = hadInfinity
            ? this.sliderMax
            : (Number.isFinite(this.filters.amountMax) ? this.filters.amountMax : this.sliderMax);

        lo = Math.max(0, Math.min(lo, this.sliderMax));
        hi = Math.max(0, Math.min(hi, this.sliderMax));

        if (lo > hi) lo = hi;

        this.filters.amountMin = lo;
        this.filters.amountMax = hadInfinity ? Infinity : hi;

        sMin.value = String(lo);
        sMax.value = String(hi);

        this.updateSliderUI(lo, hi);
    },

    updateSliderUI(lo, hi) {
        const fill = document.getElementById('ds-fill');
        const pctL = (lo / this.sliderMax) * 100;
        const pctR = (hi / this.sliderMax) * 100;

        fill.style.left = pctL + '%';
        fill.style.width = (pctR - pctL) + '%';

        document.getElementById('slider-val-min').textContent = '€' + lo;

        const isOpenEnded = this.filters.amountMax === Infinity && hi >= this.sliderMax;
        document.getElementById('slider-val-max').textContent =
            isOpenEnded ? `€${this.sliderMax}+` : `€${hi}`;
    },

    openFilterPanel() {
        this.filterOpen = true;
        this.syncFilterUI();

        const panel = document.getElementById('filter-panel');
        panel.classList.remove('hidden');
        document.getElementById('btn-filter-toggle').classList.add('active');

        history.pushState({ panel: 'filter' }, '');

        requestAnimationFrame(() => {
            const h = panel.offsetHeight;
            document.getElementById('app-main').style.marginTop = `calc(var(--header-h) + ${h}px)`;
        });
    },

    closeFilterPanel(fromPopstate) {
        const wasOpen = this.filterOpen;
        this.filterOpen = false;
        this.advancedFiltersOpen = false;
        document.getElementById('filter-panel').classList.add('hidden');
        document.getElementById('btn-filter-toggle').classList.remove('active');
        document.getElementById('advanced-filters').classList.add('hidden');
        document.getElementById('btn-advanced-toggle').classList.remove('active');
        document.body.classList.remove('no-scroll');
        document.getElementById('app-main').style.marginTop = '';
        if (wasOpen && !fromPopstate) {
            try { history.back(); } catch (_) { }
        }
    },

    /* --- Filter state --- */
    onFilterChange() {
        this.updateFilterBadge();

        if (this.currentPage === 'timeline') this.renderTimeline();
        if (this.currentPage === 'stats') this.renderStats();
    },

    getActiveFilterCount() {
        let n = 0;

        if (this.filters.query) n++;
        if (this.filters.categories.size > 0) n++;
        if (this.filters.methods.size > 0) n++;
        if (this.filters.amountMin > 0 || this.filters.amountMax < Infinity) n++;
        if (this.filters.dateFrom || this.filters.dateTo) n++;

        return n;
    },

    updateFilterBadge() {
        const n = this.getActiveFilterCount();
        const badge = document.getElementById('filter-badge');
        const resetBtn = document.getElementById('btn-filter-reset');
        const info = document.getElementById('filter-info');

        if (n > 0) {
            badge.textContent = n;
            badge.classList.remove('hidden');
            resetBtn.classList.remove('hidden');

            const allSpese = Storage.getSpese();
            const filtered = this.applyFilters(allSpese);
            const total = filtered.reduce((sum, x) => sum + x.importo, 0);

            info.textContent = `${n} filtr${n === 1 ? 'o attivo' : 'i attivi'} · ${filtered.length} risultat${filtered.length === 1 ? 'o' : 'i'} · €${total.toFixed(2)}`;
        } else {
            badge.classList.add('hidden');
            resetBtn.classList.add('hidden');
            info.textContent = '';
        }
    },

    resetFilters() {
        this.filters.query = '';
        this.filters.categories.clear();
        this.filters.methods.clear();
        this.filters.amountMin = 0;
        this.filters.amountMax = Infinity;
        this.filters.dateFrom = '';
        this.filters.dateTo = '';

        this.syncFilterUI();
        this.onFilterChange();
        this.showToast('Filtri resettati', 'info');
    },

    /* --- Apply filters --- */
    applyFilters(spese) {
        let result = spese;

        if (this.filters.query) {
            const q = this.filters.query.toLowerCase();
            result = result.filter(s =>
                (s.descrizione || '').toLowerCase().includes(q) ||
                (s.nota || '').toLowerCase().includes(q) ||
                (s.tags && s.tags.some(t => t.toLowerCase().includes(q)))
            );
        }

        if (this.filters.categories.size > 0) {
            result = result.filter(s => this.filters.categories.has(s.categoria));
        }

        if (this.filters.methods.size > 0) {
            result = result.filter(s => this.filters.methods.has(s.metodo));
        }

        if (this.filters.amountMin > 0) {
            result = result.filter(s => s.importo >= this.filters.amountMin);
        }

        if (this.filters.amountMax < Infinity) {
            result = result.filter(s => s.importo <= this.filters.amountMax);
        }

        if (this.filters.dateFrom) {
            const from = new Date(this.filters.dateFrom + 'T00:00:00');
            result = result.filter(s => new Date(s.data) >= from);
        }

        if (this.filters.dateTo) {
            const to = new Date(this.filters.dateTo + 'T23:59:59');
            result = result.filter(s => new Date(s.data) <= to);
        }

        return result;
    },

    applyNonDateFilters(spese) {
        const origFrom = this.filters.dateFrom;
        const origTo = this.filters.dateTo;

        this.filters.dateFrom = '';
        this.filters.dateTo = '';

        const result = this.applyFilters(spese);

        this.filters.dateFrom = origFrom;
        this.filters.dateTo = origTo;

        return result;
    },

    hasActiveFilters() {
        return this.getActiveFilterCount() > 0;
    },

    /* =====================
       INPUT
       ===================== */
    initInput() {
        const input = document.getElementById('expense-input');
        const btnSend = document.getElementById('btn-send');
        const btnVoice = document.getElementById('btn-voice');

        btnSend.addEventListener('click', () => this.submitExpense());
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.submitExpense();
            }
        });

        input.addEventListener('focus', () => {
            if (!this._expenseInputActive) {
                this._expenseInputActive = true;
                try { history.pushState({ panel: 'expense-input' }, ''); } catch (_) {}
            }
        });

        input.addEventListener('blur', () => {
            if (this._expenseInputActive) {
                this._expenseInputActive = false;
                this._suppressNextPopstate = true;
                try { history.back(); } catch (_) { }
            }
        });

        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

            this.recognition = new SR();
            this.recognition.lang = 'it-IT';
            this.recognition.continuous = false;
            this.recognition.interimResults = false;

            this.recognition.onresult = e => {
                input.value = e.results[0][0].transcript;
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
        try { input.blur(); } catch (_) { }
        try { document.activeElement.blur(); } catch (_) { }

        if (this.filterOpen) this.recalcSliderMax();

        this.renderTimeline();
        if (this.currentPage === 'stats') this.renderStats();

        const cat = this.getCat(spesa.categoria);
        this.showToast(`${cat.emoji} ${spesa.descrizione} · €${spesa.importo.toFixed(2)}`, 'success');
    },

    /* =====================
       TIMELINE
       ===================== */
    renderTimeline() {
        const allSpese = Storage.getSpese();
        const filtered = this.hasActiveFilters() ? this.applyFilters(allSpese) : allSpese;
        const content = document.getElementById('timeline-content');
        const empty = document.getElementById('timeline-empty');
        const summary = document.getElementById('timeline-summary');

        if (allSpese.length === 0) {
            content.innerHTML = '';
            summary.innerHTML = '';
            empty.classList.remove('hidden');
            return;
        }

        empty.classList.add('hidden');

        const oggi = new Date();
        const oggiKey = this.dateKey(oggi);
        const meseCorrente = oggi.getMonth();
        const annoCorrente = oggi.getFullYear();

        let totOggi = 0;
        let totMese = 0;

        allSpese.forEach(s => {
            const d = new Date(s.data);

            if (this.dateKey(d) === oggiKey) totOggi += s.importo;
            if (d.getMonth() === meseCorrente && d.getFullYear() === annoCorrente) totMese += s.importo;
        });

        const nomeMese = oggi.toLocaleDateString('it-IT', { month: 'long' });

        const isFiltered = this.hasActiveFilters();

        let summaryLabel1, summaryValue1, summaryLabel2, summaryValue2, summaryLabel3, summaryValue3;

        if (isFiltered) {
            const filteredTotal = filtered.reduce((sum, x) => sum + x.importo, 0);
            summaryLabel1 = 'Filtro Attivo';
            summaryValue1 = '🔍';
            summaryLabel2 = 'Totale';
            summaryValue2 = `€${filteredTotal.toFixed(2)}`;
            summaryLabel3 = 'N. spese';
            summaryValue3 = filtered.length;
        } else {
            summaryLabel1 = 'Oggi';
            summaryValue1 = `€${totOggi.toFixed(2)}`;
            summaryLabel2 = nomeMese;
            summaryValue2 = `€${totMese.toFixed(2)}`;
            summaryLabel3 = 'N. spese';
            summaryValue3 = allSpese.length;
        }

        summary.innerHTML = `
            <div class="summary-row">
                <div class="summary-item">
                    <div class="summary-label">${summaryLabel1}</div>
                    <div class="summary-value">${summaryValue1}</div>
                </div>
                <div class="summary-divider"></div>
                <div class="summary-item">
                    <div class="summary-label">${summaryLabel2}</div>
                    <div class="summary-value">${summaryValue2}</div>
                </div>
                <div class="summary-divider"></div>
                <div class="summary-item">
                    <div class="summary-label">${summaryLabel3}</div>
                    <div class="summary-value">${summaryValue3}</div>
                </div>
            </div>
        `;

        if (filtered.length === 0 && this.hasActiveFilters()) {
            content.innerHTML = '<div class="stats-empty">🔍<br>Nessuna spesa trovata con questi filtri</div>';
            return;
        }

        const groups = this.groupByDay(filtered);

        content.innerHTML = groups.map(g => {
            const dayTotal = g.spese.reduce((sum, x) => sum + x.importo, 0);

            return `
                <div class="day-group">
                    <div class="day-header">
                        <span class="day-date">${this.formatDayLabel(g.date)}</span>
                        <span class="day-total">€${dayTotal.toFixed(2)}</span>
                    </div>
                    ${g.spese.map(s => this.createCard(s)).join('')}
                </div>
            `;
        }).join('');

        content.querySelectorAll('.expense-card').forEach(card => {
            card.addEventListener('click', () => this.openEditModal(card.dataset.id));
        });
    },

    createCard(s) {
        const cat = this.getCat(s.categoria);
        const met = this.getMet(s.metodo);
        const d = new Date(s.data);
        const ora = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        const isNew = s.id === this.newCardId;
        const hasTags = s.tags && s.tags.length > 0;

        if (isNew) this.newCardId = null;

        return `
            <div class="expense-card${isNew ? ' new-card' : ''}" data-id="${s.id}">
                <div class="expense-emoji">${cat.emoji}</div>
                <div class="expense-info">
                    <div class="expense-desc"><span class="expense-met-icon">${met.emoji}</span>${this.esc(s.descrizione)}</div>
                    <div class="expense-meta">
                        <span>${ora}</span><span class="dot"></span>
                        <span>${cat.nome}</span>
                        ${hasTags ? '<span class="dot"></span><span>🏷️</span>' : ''}
                        ${s.nota ? '<span class="dot"></span><span>📝</span>' : ''}
                    </div>
                </div>
                <div class="expense-amount">€${s.importo.toFixed(2)}</div>
            </div>
        `;
    },

    /* =====================
       EDIT MODAL
       ===================== */
    isModalOpen() {
        const overlay = document.getElementById('modal-overlay');
        return !!overlay && !overlay.classList.contains('hidden') && this.editingId !== null;
    },

    getViewportHeight() {
        if (window.visualViewport && Number.isFinite(window.visualViewport.height)) {
            return window.visualViewport.height;
        }
        return window.innerHeight || document.documentElement.clientHeight || 0;
    },

    getOpenModalDropdown() {
        return document.querySelector('#edit-modal .searchable-dropdown.open');
    },

    getActivePlainModalField() {
        const modal = document.getElementById('edit-modal');
        const el = document.activeElement;

        if (!this.isModalOpen() || !modal || !el || !modal.contains(el)) return null;
        if (el.closest('.searchable-dropdown')) return null;

        if (el.matches('input[type="date"], input[type="time"]')) return null;
        return el.matches('input, textarea, select') ? el : null;
    },

    bindNonStickyNativePicker(el) {
        if (!el || typeof el.showPicker !== 'function') return;

        let openedProgrammatically = false;

        const openPicker = (e) => {
            openedProgrammatically = true;
            e.preventDefault();
            e.stopPropagation();

            if (typeof this.clearModalSelection === 'function') {
                this.clearModalSelection();
            }

            try {
                if (document.activeElement === el) el.blur();
            } catch (_) { }

            try {
                el.classList.add('picker-open');
                el.showPicker();
            } catch (_) {
                openedProgrammatically = false;
                el.classList.remove('picker-open');
                try { el.focus(); } catch (_) { }
                return;
            }

            setTimeout(() => {
                if (document.activeElement === el) {
                    try { el.blur(); } catch (_) { }
                }
                openedProgrammatically = false;
            }, 0);
        };

        el.addEventListener('pointerdown', openPicker);

        const closeVisuals = (e) => {
            if (e.target !== el) {
                el.classList.remove('picker-open');
            }
        };
        document.addEventListener('pointerdown', closeVisuals, { passive: true });
        window.addEventListener('focus', () => el.classList.remove('picker-open'));

        el.addEventListener('focus', (e) => {
            if (!openedProgrammatically) {
                try { el.blur(); } catch (_) { }
                el.classList.remove('picker-open');
                return;
            }

            setTimeout(() => {
                if (document.activeElement === el) {
                    try { el.blur(); } catch (_) { }
                }
            }, 0);
        });

        el.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                if (typeof el.showPicker !== 'function') return;
                e.preventDefault();

                if (typeof this.clearModalSelection === 'function') {
                    this.clearModalSelection();
                }

                try {
                    el.classList.add('picker-open');
                    el.showPicker();
                } catch (_) {
                    el.classList.remove('picker-open');
                }
                setTimeout(() => {
                    if (document.activeElement === el) {
                        try { el.blur(); } catch (_) { }
                    }
                }, 0);
            } else if (e.key === 'Escape') {
                el.classList.remove('picker-open');
                try { el.blur(); } catch (_) { }
            }
        });
    },

    pushModalHistoryState() {
        try {
            history.pushState({ panel: 'modal' }, '');
        } catch (_) { }
    },

    ensureModalInteractionState() {
        if (!this.isModalOpen() || this._modalInteractionActive) return;

        this._modalInteractionActive = true;

        try {
            history.pushState({ panel: 'modal-interaction' }, '');
        } catch (_) { }
    },

    releaseModalInteractionState() {
        if (!this._modalInteractionActive) return;

        this._modalInteractionActive = false;
        this._suppressNextPopstate = true;

        try {
            history.back();
        } catch (_) { }
    },

    clearModalSelection() {
        const dropdown = this.getOpenModalDropdown();
        if (dropdown) {
            const sdInput = dropdown.querySelector('.sd-input');
            if (sdInput) {
                try { sdInput.blur(); } catch (_) { }
            } else {
                dropdown.classList.remove('open');
            }
        }

        const active = this.getActivePlainModalField();
        if (active) {
            try { active.blur(); } catch (_) { }
        }

        ['edit-data', 'edit-ora'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('picker-open');
        });

        const sel = window.getSelection ? window.getSelection() : null;
        if (sel && sel.rangeCount > 0) {
            try { sel.removeAllRanges(); } catch (_) { }
        }
    },

    handleModalViewportChange() {
        const currentHeight = this.getViewportHeight();

        if (this.isModalOpen()) {
            const active = this.getActivePlainModalField();

            if (active) {
                const type = (active.type || '').toLowerCase();
                const isTextLike =
                    active.tagName === 'TEXTAREA' ||
                    ['text', 'number', 'search', 'email', 'tel', 'url', 'password'].includes(type);
                const isPicker = type === 'date' || type === 'time';

                if ((isTextLike || isPicker) && currentHeight - this._lastViewportHeight > 100) {
                    try { active.blur(); } catch (_) { }
                }
            }
        }

        if (this.filterOpen) {
            const searchInput = document.getElementById('search-input');
            if (searchInput && document.activeElement === searchInput && (currentHeight - this._lastViewportHeight > 100)) {
                try { searchInput.blur(); } catch (_) { }
            }
        }

        if (this.currentPage === 'timeline') {
            const expenseInput = document.getElementById('expense-input');
            if (expenseInput && document.activeElement === expenseInput && (currentHeight - this._lastViewportHeight > 100)) {
                try { expenseInput.blur(); } catch (_) { }
            }
        }

        this._lastViewportHeight = currentHeight;
    },

    startModalViewportWatch() {
        this.stopModalViewportWatch();
        this._lastViewportHeight = this.getViewportHeight();

        this._keyboardWatchTimer = setInterval(() => {
            this.handleModalViewportChange();
        }, 120);
    },

    stopModalViewportWatch() {
        if (this._keyboardWatchTimer) {
            clearInterval(this._keyboardWatchTimer);
            this._keyboardWatchTimer = null;
        }
    },

    initModal() {
        document.getElementById('modal-close').addEventListener('click', () => this.closeModal());

        document.getElementById('modal-overlay').addEventListener('click', e => {
            if (e.target.id === 'modal-overlay') this.closeModal();
        });

        document.getElementById('btn-save').addEventListener('click', () => this.saveEdit());

        document.getElementById('btn-delete').addEventListener('click', () => {
            this.showConfirm('Eliminare questa spesa?', () => {
                Storage.deleteSpesa(this.editingId);

                if (this.filterOpen) this.recalcSliderMax();

                this.closeModal();
                this.renderTimeline();
                if (this.currentPage === 'stats') this.renderStats();
                this.showToast('Spesa eliminata', 'info');
            });
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeConfirm();
            }
        });

        ['edit-data', 'edit-ora'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;

            this.bindNonStickyNativePicker(el);

            el.addEventListener('change', () => {
                el.classList.remove('picker-open');
                setTimeout(() => {
                    if (document.activeElement === el) {
                        try { el.blur(); } catch (_) { }
                    }
                }, 0);
            });

            el.addEventListener('focus', () => {
                this._lastViewportHeight = this.getViewportHeight();
            });
        });

        const handleViewportResize = () => this.handleModalViewportChange();

        window.addEventListener('resize', handleViewportResize);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportResize);
        }

        const blurPickerOnReturn = () => {
            ['edit-data', 'edit-ora'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.remove('picker-open');
            });

            if (!this.isModalOpen()) return;

            const active = this.getActivePlainModalField();
            if (!active) return;

            const type = (active.type || '').toLowerCase();
            if (type === 'date' || type === 'time') {
                setTimeout(() => {
                    if (document.activeElement === active) {
                        try { active.blur(); } catch (_) { }
                    }
                }, 0);
            }
        };

        window.addEventListener('focus', blurPickerOnReturn);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                blurPickerOnReturn();
            }
        });

        window.addEventListener('popstate', () => {
            if (this._suppressNextPopstate) {
                this._suppressNextPopstate = false;
                return;
            }

            if (this.isModalOpen()) {
                const dropdownOpen = !!this.getOpenModalDropdown();
                const activeField = this.getActivePlainModalField();

                if (this._modalInteractionActive || dropdownOpen) {
                    this._suspendInteractionRelease = true;
                    this.clearModalSelection();
                    this._modalInteractionActive = false;

                    setTimeout(() => {
                        this._suspendInteractionRelease = false;
                    }, 0);

                    return;
                }

                if (activeField) {
                    this.clearModalSelection();
                    this.pushModalHistoryState();
                    return;
                }

                this.closeModal(true);
                return;
            }

            if (this._filterSearchActive) {
                this._filterSearchActive = false;
                const searchInput = document.getElementById('search-input');
                if (searchInput) searchInput.blur();
                return;
            }

            if (this._expenseInputActive) {
                this._expenseInputActive = false;
                const expenseInput = document.getElementById('expense-input');
                if (expenseInput) expenseInput.blur();
                return;
            }

            if (this.advancedFiltersOpen) {
                this.advancedFiltersOpen = false;
                document.getElementById('advanced-filters').classList.add('hidden');
                document.getElementById('btn-advanced-toggle').classList.remove('active');
                document.body.classList.remove('no-scroll');
                requestAnimationFrame(() => {
                    const panel = document.getElementById('filter-panel');
                    const h = panel.offsetHeight;
                    document.getElementById('app-main').style.marginTop = `calc(var(--header-h) + ${h}px)`;
                });
                return;
            }

            if (this.filterOpen) {
                this.closeFilterPanel(true);
                return;
            }

            if (this.currentPage !== 'timeline') {
                this.navigateTo('timeline', true);
                return;
            }
        });

        ['edit-importo', 'edit-descrizione', 'edit-nota'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('keydown', e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        el.blur();
                    }
                });
            }
        });
    },

    /* --- Searchable Dropdown --- */
    _sdInstances: {},

    initSearchableDropdown(containerId, items, currentValue) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const selected = items.find(i => i.id === currentValue) || items[0];

        container.innerHTML = `
            <input type="text" class="sd-input" autocomplete="nope" autocorrect="off" autocapitalize="none" spellcheck="false" data-form-type="other" enterkeyhint="done" readOnly
                   value="${selected.emoji} ${selected.nome}" data-value="${selected.id}">
            <span class="sd-arrow">▼</span>
            <div class="sd-list"></div>
        `;

        const input = container.querySelector('.sd-input');
        const list = container.querySelector('.sd-list');
        let highlightIdx = -1;
        let isEditable = false;

        const renderList = (filter = '') => {
            const q = filter.toLowerCase();
            const filtered = q
                ? items.filter(i => i.nome.toLowerCase().includes(q) || (i.emoji + ' ' + i.nome).toLowerCase().includes(q))
                : items;

            if (filtered.length === 0) {
                list.innerHTML = '<div class="sd-empty">Nessun risultato</div>';
                highlightIdx = -1;
                return;
            }

            highlightIdx = -1;
            list.innerHTML = filtered.map((item, idx) =>
                `<div class="sd-item${item.id === input.dataset.value ? ' selected' : ''}" data-id="${item.id}" data-idx="${idx}">${item.emoji} ${item.nome}</div>`
            ).join('');

            list.querySelectorAll('.sd-item').forEach(el => {
                el.addEventListener('mousedown', e => {
                    e.preventDefault();
                    selectItem(items.find(i => i.id === el.dataset.id));
                });
            });
        };

        const selectItem = (item) => {
            input.value = `${item.emoji} ${item.nome}`;
            input.dataset.value = item.id;
            close();
            try { input.blur(); } catch (_) { }
        };

        const open = () => {
            const wasClosed = !container.classList.contains('open');
            container.classList.add('open');

            if (wasClosed) {
                this.ensureModalInteractionState();
            }

            renderList();
        };

        const close = () => {
            const wasOpen = container.classList.contains('open');

            container.classList.remove('open');
            input.readOnly = true;
            isEditable = false;
            const sel = items.find(i => i.id === input.dataset.value) || items[0];
            input.value = `${sel.emoji} ${sel.nome}`;

            if (wasOpen && this._modalInteractionActive && !this._suspendInteractionRelease) {
                this.releaseModalInteractionState();
            }
        };

        input.addEventListener('mousedown', e => {
            if (!container.classList.contains('open')) {
                e.preventDefault();
                input.focus();
                open();
            } else if (!isEditable) {
                e.preventDefault();
                isEditable = true;
                input.readOnly = false;
                input.value = '';
                input.focus();
                setTimeout(() => {
                    container.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }
        });

        input.addEventListener('focus', () => {
            if (!container.classList.contains('open')) {
                open();
            }
        });

        input.addEventListener('input', () => {
            if (!container.classList.contains('open')) {
                open();
            }
            renderList(input.value);
        });

        input.addEventListener('blur', () => {
            close();
        });

        input.addEventListener('keydown', e => {
            const items_in_list = list.querySelectorAll('.sd-item');
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                highlightIdx = Math.min(highlightIdx + 1, items_in_list.length - 1);
                items_in_list.forEach((el, i) => el.classList.toggle('highlighted', i === highlightIdx));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                highlightIdx = Math.max(highlightIdx - 1, 0);
                items_in_list.forEach((el, i) => el.classList.toggle('highlighted', i === highlightIdx));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (highlightIdx >= 0 && highlightIdx < items_in_list.length) {
                    const id = items_in_list[highlightIdx].dataset.id;
                    selectItem(items.find(i => i.id === id));
                } else if (items_in_list.length > 0) {
                    const id = items_in_list[0].dataset.id;
                    selectItem(items.find(i => i.id === id));
                }
                input.blur();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                close();
                input.blur();
            }
        });

        this._sdInstances[containerId] = {
            getValue: () => input.dataset.value,
            setValue: (val) => {
                const item = items.find(i => i.id === val) || items[0];
                input.dataset.value = item.id;
                input.value = `${item.emoji} ${item.nome}`;
            }
        };
    },

    /* --- Tags --- */
    _editTags: [],

    getAllTags() {
        const spese = Storage.getSpese();
        const tagSet = new Set();
        spese.forEach(s => {
            if (s.tags && Array.isArray(s.tags)) {
                s.tags.forEach(t => tagSet.add(t));
            }
        });
        return [...tagSet].sort();
    },

    getTagStats() {
        const spese = Storage.getSpese();
        const freq = {};
        const lastUsed = {};

        spese.forEach(s => {
            if (!s.tags || !Array.isArray(s.tags)) return;
            const ts = new Date(s.data).getTime();
            s.tags.forEach(t => {
                freq[t] = (freq[t] || 0) + 1;
                if (!lastUsed[t] || ts > lastUsed[t]) lastUsed[t] = ts;
            });
        });

        return { freq, lastUsed };
    },

    initTagInput() {
        const container = document.getElementById('sd-tags');
        const chipsEl = document.getElementById('tag-chips');
        if (!container) return;

        container.innerHTML = `
            <input type="text" class="sd-input" placeholder="Aggiungi tag..." autocomplete="nope" autocorrect="off" autocapitalize="none" spellcheck="false" data-form-type="other" enterkeyhint="done" readOnly>
            <div class="sd-list"></div>
        `;

        const input = container.querySelector('.sd-input');
        const list = container.querySelector('.sd-list');
        let isEditable = false;

        const renderChips = () => {
            chipsEl.innerHTML = this._editTags.map(tag =>
                `<span class="tag-chip">#${this.esc(tag)}<button class="tag-remove" data-tag="${this.esc(tag)}">&times;</button></span>`
            ).join('');

            chipsEl.querySelectorAll('.tag-remove').forEach(btn => {
                btn.addEventListener('mousedown', e => {
                    e.preventDefault();
                    e.stopPropagation();
                });
                btn.addEventListener('click', e => {
                    e.stopPropagation();
                    this._editTags = this._editTags.filter(t => t !== btn.dataset.tag);
                    renderChips();
                    if (isEditable) {
                        input.focus();
                        renderList(input.value);
                    }
                });
            });
        };

        const renderList = (filter = '') => {
            const allTags = this.getAllTags();
            const { freq, lastUsed } = this.getTagStats();
            const q = filter.toLowerCase().replace(/^#/, '');
            const available = allTags.filter(t =>
                !this._editTags.includes(t) && (q ? t.toLowerCase().includes(q) : true)
            );

            let orderedItems = [];
            if (available.length > 0 && !q) {
                const sorted = available.slice().sort((a, b) => (lastUsed[b] || 0) - (lastUsed[a] || 0));
                const mostRecent = sorted[0];
                orderedItems.push({ tag: mostRecent, icon: '🕐' });

                const byFreq = available.slice().sort((a, b) => (freq[b] || 0) - (freq[a] || 0));
                const starItems = [];
                for (const t of byFreq) {
                    if (t !== mostRecent && starItems.length < 2) {
                        starItems.push({ tag: t, icon: '⭐' });
                    }
                }
                orderedItems.push(...starItems);

                const usedTags = new Set(orderedItems.map(i => i.tag));
                for (const t of sorted) {
                    if (!usedTags.has(t)) {
                        orderedItems.push({ tag: t, icon: '' });
                    }
                }
            } else {
                orderedItems = available.map(t => ({ tag: t, icon: '' }));
            }

            let html = orderedItems.map(({ tag, icon }) =>
                `<div class="sd-item" data-tag="${this.esc(tag)}"><span>#${this.esc(tag)}</span>${icon ? `<span class="tag-hint-icon">${icon}</span>` : ''}</div>`
            ).join('');

            const cleanTag = q.replace(/\s+/g, '');
            if (cleanTag && !allTags.includes(cleanTag) && !this._editTags.includes(cleanTag)) {
                html += `<div class="sd-item create-new" data-tag="${this.esc(cleanTag)}">+ Crea "#${this.esc(cleanTag)}"</div>`;
            }

            if (!html) {
                list.innerHTML = '<div class="sd-empty">Nessun tag</div>';
            } else {
                list.innerHTML = html;
            }

            list.querySelectorAll('.sd-item').forEach(el => {
                el.addEventListener('mousedown', e => {
                    e.preventDefault();
                    addTag(el.dataset.tag);
                });
            });
        };

        const addTag = (tag) => {
            tag = tag.replace(/\s+/g, '');
            if (!tag || this._editTags.includes(tag)) return;
            this._editTags.push(tag);
            input.value = '';
            renderChips();
            renderList();
        };

        const open = () => {
            const wasClosed = !container.classList.contains('open');
            container.classList.add('open');

            if (wasClosed) {
                this.ensureModalInteractionState();
            }

            renderList();
        };

        const close = () => {
            const wasOpen = container.classList.contains('open');

            container.classList.remove('open');
            input.readOnly = true;
            isEditable = false;
            input.value = '';

            if (wasOpen && this._modalInteractionActive && !this._suspendInteractionRelease) {
                this.releaseModalInteractionState();
            }
        };

        input.addEventListener('mousedown', e => {
            if (!container.classList.contains('open')) {
                e.preventDefault();
                input.focus();
                open();
            } else if (!isEditable) {
                e.preventDefault();
                isEditable = true;
                input.readOnly = false;
                input.value = '';
                input.focus();
            }
        });

        input.addEventListener('focus', () => {
            if (!container.classList.contains('open')) open();
        });
        input.addEventListener('input', () => renderList(input.value));
        input.addEventListener('blur', () => close());

        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const items_in_list = list.querySelectorAll('.sd-item');
                if (items_in_list.length > 0) {
                    const firstTag = items_in_list[0].dataset.tag;
                    if (firstTag) {
                        addTag(firstTag);
                    }
                } else {
                    const val = input.value.replace(/\s+/g, '').replace(/^#/, '');
                    if (val) addTag(val);
                }
            }
        });

        renderChips();
    },

    populateDropdowns() {
        // Dropdowns are now initialized per-open in openEditModal
    },

    openEditModal(id) {
        const spesa = Storage.getSpese().find(s => s.id === id);
        if (!spesa) return;

        this.editingId = id;

        const d = new Date(spesa.data);
        document.getElementById('edit-importo').value = spesa.importo;
        document.getElementById('edit-descrizione').value = spesa.descrizione;
        document.getElementById('edit-data').value = this.toInputDate(d);
        document.getElementById('edit-ora').value = this.toInputTime(d);
        document.getElementById('edit-nota').value = spesa.nota || '';

        this.initSearchableDropdown('sd-categoria', CATEGORIES, spesa.categoria || 'altro');
        this.initSearchableDropdown('sd-metodo', PAYMENT_METHODS, spesa.metodo || 'carta');

        this._editTags = Array.isArray(spesa.tags) ? [...spesa.tags] : [];
        this.initTagInput();

        this._modalInteractionActive = false;
        this._suspendInteractionRelease = false;
        this._lastViewportHeight = this.getViewportHeight();

        document.getElementById('modal-overlay').classList.remove('hidden');
        document.body.classList.add('no-scroll');
        this.startModalViewportWatch();
        this.pushModalHistoryState();
    },

    closeModal(fromPopstate = false) {
        const hadInteractionState = this._modalInteractionActive;

        this._suspendInteractionRelease = true;
        this.clearModalSelection();
        this._suspendInteractionRelease = false;

        document.getElementById('modal-overlay').classList.add('hidden');
        document.body.classList.remove('no-scroll');
        this.editingId = null;
        this._modalInteractionActive = false;
        this.stopModalViewportWatch();

        if (!fromPopstate) {
            this._suppressNextPopstate = true;

            try {
                history.go(hadInteractionState ? -2 : -1);
            } catch (_) {
                try { history.back(); } catch (_) { }
            }
        }
    },

    saveEdit() {
        const importo = parseFloat(document.getElementById('edit-importo').value);

        if (!importo || importo <= 0) {
            this.showToast('Importo non valido', 'error');
            return;
        }

        const dateVal = document.getElementById('edit-data').value;
        const timeVal = document.getElementById('edit-ora').value;

        const catValue = this._sdInstances['sd-categoria'] ? this._sdInstances['sd-categoria'].getValue() : 'altro';
        const metValue = this._sdInstances['sd-metodo'] ? this._sdInstances['sd-metodo'].getValue() : 'carta';

        Storage.updateSpesa(this.editingId, {
            importo: Math.round(importo * 100) / 100,
            descrizione: document.getElementById('edit-descrizione').value || 'Spesa',
            categoria: catValue,
            metodo: metValue,
            data: new Date(`${dateVal}T${timeVal || '12:00'}:00`).toISOString(),
            nota: document.getElementById('edit-nota').value,
            tags: [...this._editTags]
        });

        if (this.filterOpen) this.recalcSliderMax();

        this.closeModal();
        this.renderTimeline();
        if (this.currentPage === 'stats') this.renderStats();
        this.showToast('Spesa modificata ✓', 'success');
    },

    /* =====================
       CONFIRM
       ===================== */
    showConfirm(msg, onYes) {
        document.getElementById('confirm-message').textContent = msg;
        document.getElementById('confirm-overlay').classList.remove('hidden');

        const yesBtn = document.getElementById('confirm-yes');
        const noBtn = document.getElementById('confirm-no');

        const newYes = yesBtn.cloneNode(true);
        const newNo = noBtn.cloneNode(true);

        yesBtn.replaceWith(newYes);
        noBtn.replaceWith(newNo);

        newYes.addEventListener('click', () => {
            this.closeConfirm();
            onYes();
        });

        newNo.addEventListener('click', () => this.closeConfirm());
    },

    closeConfirm() {
        document.getElementById('confirm-overlay').classList.add('hidden');
    },

    /* =============================================
       STATS
       ============================================= */
    getDataBounds(spese) {
        if (!spese.length) return null;

        const times = spese
            .map(s => new Date(s.data).getTime())
            .filter(t => Number.isFinite(t));

        if (!times.length) return null;

        const start = new Date(Math.min(...times));
        const end = new Date(Math.max(...times));

        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        return { start, end };
    },

    getPeriodDates(allSpese = []) {
        const now = new Date();
        let start;
        let end;
        let label;

        switch (this.statsPeriod) {
            case 'week': {
                const ref = new Date(now);
                ref.setDate(ref.getDate() + this.statsOffset * 7);

                end = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 23, 59, 59, 999);
                start = new Date(end);
                start.setDate(start.getDate() - 6);
                start.setHours(0, 0, 0, 0);

                const sl = start.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
                const el = end.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
                label = `${sl} — ${el}`;
                break;
            }

            case 'month': {
                const ref = new Date(now.getFullYear(), now.getMonth() + this.statsOffset, 1);

                start = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
                end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
                label = ref.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
                break;
            }

            case 'year': {
                const year = now.getFullYear() + this.statsOffset;

                start = new Date(year, 0, 1, 0, 0, 0, 0);
                end = new Date(year, 11, 31, 23, 59, 59, 999);
                label = year.toString();
                break;
            }

            case 'custom': {
                const df = this.filters.dateFrom;
                const dt = this.filters.dateTo;
                const bounds = this.getDataBounds(allSpese);

                if (df) {
                    start = new Date(df + 'T00:00:00');
                } else if (bounds) {
                    start = new Date(bounds.start);
                } else {
                    start = new Date();
                    start.setHours(0, 0, 0, 0);
                }

                if (dt) {
                    end = new Date(dt + 'T23:59:59');
                } else if (bounds) {
                    end = new Date(bounds.end);
                } else {
                    end = new Date();
                    end.setHours(23, 59, 59, 999);
                }

                if (df && dt) {
                    const sl = start.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
                    const el = end.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
                    label = `${sl} — ${el}`;
                } else if (df) {
                    label = 'Dal ' + start.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
                } else if (dt) {
                    label = 'Fino al ' + end.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
                } else {
                    label = 'Tutto il periodo';
                }

                break;
            }

            default: {
                start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                label = now.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
            }
        }

        return { start, end, label };
    },

    getActualPeriodEnd(end) {
        return new Date(Math.min(end.getTime(), Date.now()));
    },

    getRangeDays(start, end) {
        const actualEnd = this.getActualPeriodEnd(end);
        const diff = actualEnd.getTime() - start.getTime();
        if (diff < 0) return 1;
        return Math.max(1, Math.floor(diff / 86400000) + 1);
    },

    getBarAggregation(start, end) {
        if (this.statsPeriod === 'year') return 'month';

        const rangeDays = this.getRangeDays(start, end);

        if (rangeDays > 365) return 'month';
        if (rangeDays > 90) return 'week';
        return 'day';
    },

    getBarChartTitle(start, end) {
        const aggregation = this.getBarAggregation(start, end);

        if (aggregation === 'month') return 'Andamento mensile';
        if (aggregation === 'week') return 'Andamento settimanale';
        return 'Andamento giornaliero';
    },

    renderStats() {
        const container = document.getElementById('stats-content');
        const allSpese = Storage.getSpese();

        this.destroyCharts();

        if (allSpese.length === 0) {
            container.innerHTML = '<div class="stats-empty">📊<br>Aggiungi qualche spesa per vedere le statistiche</div>';
            return;
        }

        const { start, end, label } = this.getPeriodDates(allSpese);

        let filtered = allSpese.filter(s => {
            const d = new Date(s.data);
            return d >= start && d <= end;
        });

        filtered = this.applyNonDateFilters(filtered);

        const total = filtered.reduce((sum, x) => sum + x.importo, 0);
        const days = this.getRangeDays(start, end);
        const avg = total / days;

        const byCat = {};
        filtered.forEach(s => {
            byCat[s.categoria] = (byCat[s.categoria] || 0) + s.importo;
        });

        const catSorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
        const maxCat = catSorted.length > 0 ? catSorted[0][1] : 1;
        const topSpese = [...filtered].sort((a, b) => b.importo - a.importo).slice(0, 5);

        const canGoNext = this.statsOffset < 0;
        const isCustom = this.statsPeriod === 'custom';
        const hasNonDateFilters =
            this.filters.query ||
            this.filters.categories.size > 0 ||
            this.filters.methods.size > 0 ||
            this.filters.amountMin > 0 ||
            this.filters.amountMax < Infinity;

        const barChartTitle = this.getBarChartTitle(start, end);

        container.innerHTML = `
            <div class="stats-period-selector">
                <button class="period-btn ${this.statsPeriod === 'week' ? 'active' : ''}" data-period="week">Settimana</button>
                <button class="period-btn ${this.statsPeriod === 'month' ? 'active' : ''}" data-period="month">Mese</button>
                <button class="period-btn ${this.statsPeriod === 'year' ? 'active' : ''}" data-period="year">Anno</button>
                <button class="period-btn ${this.statsPeriod === 'custom' ? 'active' : ''}" data-period="custom">Custom</button>
            </div>

            <div class="stats-period-nav">
                <button class="period-nav-btn" id="period-prev" title="Precedente" ${isCustom ? 'disabled' : ''}>◀</button>
                <span class="period-nav-label">${label}</span>
                <button class="period-nav-btn" id="period-next" title="Successivo" ${(!canGoNext || isCustom) ? 'disabled' : ''}>▶</button>
            </div>

            ${hasNonDateFilters ? '<div class="stats-filter-note">🔍 Filtri attivi applicati ai dati</div>' : ''}

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

            ${filtered.length > 0 ? `
                <div class="chart-container">
                    <div class="chart-title">🥧 Per categoria</div>
                    <div class="chart-wrap chart-wrap-doughnut"><canvas id="chart-doughnut"></canvas></div>
                </div>
                <div class="chart-container">
                    <div class="chart-title">📊 ${barChartTitle}</div>
                    <div class="chart-wrap"><canvas id="chart-bar"></canvas></div>
                </div>
            ` : '<div class="stats-empty">Nessuna spesa in questo periodo</div>'}

            ${catSorted.length > 0 ? `
                <div class="stats-section">
                    <div class="stats-section-title">📂 Dettaglio categorie</div>
                    ${catSorted.map(([catId, amount], idx) => {
            const cat = this.getCat(catId);
            const pct = total > 0 ? ((amount / total) * 100).toFixed(0) : 0;
            const barW = ((amount / maxCat) * 100).toFixed(1);
            const color = CHART_COLORS[idx % CHART_COLORS.length];

            return `
                            <div class="cat-bar-item">
                                <div class="cat-bar-header">
                                    <span class="cat-bar-name">${cat.emoji} ${cat.nome}</span>
                                    <span class="cat-bar-amount">€${amount.toFixed(2)} (${pct}%)</span>
                                </div>
                                <div class="cat-bar-track">
                                    <div class="cat-bar-fill" style="width:${barW}%;background:${color}"></div>
                                </div>
                            </div>
                        `;
        }).join('')}
                </div>
            ` : ''}

            ${topSpese.length > 0 ? `
                <div class="stats-section">
                    <div class="stats-section-title">🏆 Top 5 spese</div>
                    ${topSpese.map(s => {
            const cat = this.getCat(s.categoria);
            const d = new Date(s.data);

            return `
                            <div class="expense-card" style="cursor:default">
                                <div class="expense-emoji">${cat.emoji}</div>
                                <div class="expense-info">
                                    <div class="expense-desc">${this.esc(s.descrizione)}</div>
                                    <div class="expense-meta">
                                        <span>${d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</span>
                                    </div>
                                </div>
                                <div class="expense-amount">€${s.importo.toFixed(2)}</div>
                            </div>
                        `;
        }).join('')}
                </div>
            ` : ''}
        `;

        container.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const newPeriod = btn.dataset.period;
                this.statsPeriod = newPeriod;
                this.statsOffset = 0;
                this.renderStats();
            });
        });

        const prevBtn = document.getElementById('period-prev');
        const nextBtn = document.getElementById('period-next');

        if (!isCustom) {
            prevBtn.addEventListener('click', () => {
                this.statsOffset--;
                this.renderStats();
            });

            if (canGoNext) {
                nextBtn.addEventListener('click', () => {
                    this.statsOffset++;
                    this.renderStats();
                });
            }
        }

        if (filtered.length > 0) {
            this.renderCharts(filtered, start, end);
        }
    },

    /* =====================
       CHARTS
       ===================== */
    renderCharts(filtered, start, end) {
        this.destroyCharts();

        if (typeof Chart === 'undefined') return;

        const tc = this.getChartThemeColors();

        const byCat = {};
        filtered.forEach(s => {
            byCat[s.categoria] = (byCat[s.categoria] || 0) + s.importo;
        });

        const catSorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

        const ctxD = document.getElementById('chart-doughnut');
        if (ctxD) {
            this.chartDoughnut = new Chart(ctxD, {
                type: 'doughnut',
                data: {
                    labels: catSorted.map(([id]) => {
                        const c = this.getCat(id);
                        return `${c.emoji} ${c.nome}`;
                    }),
                    datasets: [{
                        data: catSorted.map(([, v]) => Math.round(v * 100) / 100),
                        backgroundColor: catSorted.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
                        borderColor: tc.cardBg,
                        borderWidth: 3,
                        hoverOffset: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    cutout: '55%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: tc.text,
                                padding: 12,
                                usePointStyle: true,
                                pointStyleWidth: 10,
                                font: { size: 11 }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: ctx => {
                                    const tot = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                    return ` €${ctx.parsed.toFixed(2)} (${((ctx.parsed / tot) * 100).toFixed(1)}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }

        const aggregation = this.getBarAggregation(start, end);
        let bar;

        if (aggregation === 'month') bar = this.buildMonthlyBarData(filtered, start, end);
        else if (aggregation === 'week') bar = this.buildWeeklyBarData(filtered, start, end);
        else bar = this.buildDailyBarData(filtered, start, end);

        const ctxB = document.getElementById('chart-bar');
        if (ctxB) {
            const numBars = bar.labels.length;

            this.chartBar = new Chart(ctxB, {
                type: 'bar',
                data: {
                    labels: bar.labels,
                    datasets: [{
                        label: 'Spese €',
                        data: bar.data,
                        backgroundColor: bar.data.map(v => v > 0 ? tc.accent + 'cc' : tc.accent + '33'),
                        borderColor: tc.accent,
                        borderWidth: 1,
                        borderRadius: 4,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: numBars <= 7 ? 1.8 : 2,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: ctx => ` €${ctx.parsed.y.toFixed(2)}`
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                color: tc.textMuted,
                                font: { size: 9 },
                                maxRotation: numBars > 14 ? 45 : 0,
                                autoSkip: true,
                                maxTicksLimit: numBars > 60 ? 15 : undefined
                            },
                            grid: { display: false }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: tc.textMuted,
                                font: { size: 10 },
                                callback: v => '€' + v
                            },
                            grid: { color: tc.grid }
                        }
                    }
                }
            });
        }
    },

    buildDailyBarData(filtered, start, end) {
        const dayMap = new Map();
        const cur = new Date(start);
        const actualEnd = this.getActualPeriodEnd(end);

        cur.setHours(0, 0, 0, 0);

        while (cur <= actualEnd) {
            dayMap.set(this.dateKey(cur), 0);
            cur.setDate(cur.getDate() + 1);
        }

        filtered.forEach(s => {
            const key = this.dateKey(new Date(s.data));
            if (dayMap.has(key)) dayMap.set(key, dayMap.get(key) + s.importo);
        });

        const labels = [];
        const data = [];
        const numDays = dayMap.size;

        for (const [key, val] of dayMap) {
            const d = new Date(key + 'T12:00:00');

            if (numDays <= 14) {
                labels.push(d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' }));
            } else if (numDays <= 62) {
                labels.push(d.getDate().toString());
            } else {
                labels.push(d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }));
            }

            data.push(Math.round(val * 100) / 100);
        }

        return { labels, data };
    },

    startOfWeek(date) {
        const d = new Date(date);
        const day = (d.getDay() + 6) % 7;
        d.setDate(d.getDate() - day);
        d.setHours(0, 0, 0, 0);
        return d;
    },

    buildWeeklyBarData(filtered, start, end) {
        const weekMap = new Map();
        const actualEnd = this.getActualPeriodEnd(end);

        let cur = this.startOfWeek(start);
        const last = this.startOfWeek(actualEnd);

        while (cur <= last) {
            weekMap.set(this.dateKey(cur), 0);
            cur.setDate(cur.getDate() + 7);
        }

        filtered.forEach(s => {
            const weekStart = this.startOfWeek(new Date(s.data));
            const key = this.dateKey(weekStart);
            if (weekMap.has(key)) weekMap.set(key, weekMap.get(key) + s.importo);
        });

        const labels = [];
        const data = [];
        const multiYear = start.getFullYear() !== actualEnd.getFullYear();

        for (const [key, val] of weekMap) {
            const ws = new Date(key + 'T12:00:00');
            const we = new Date(ws);
            we.setDate(we.getDate() + 6);
            if (we > actualEnd) we.setTime(actualEnd.getTime());

            const labelStart = ws.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
            const labelEnd = we.toLocaleDateString(
                'it-IT',
                multiYear
                    ? { day: 'numeric', month: 'short', year: '2-digit' }
                    : { day: 'numeric', month: 'short' }
            );

            labels.push(`${labelStart}–${labelEnd}`);
            data.push(Math.round(val * 100) / 100);
        }

        return { labels, data };
    },

    buildMonthlyBarData(filtered, start, end) {
        const monthMap = new Map();
        const actualEnd = this.getActualPeriodEnd(end);

        let cur = new Date(start.getFullYear(), start.getMonth(), 1);
        const last = new Date(actualEnd.getFullYear(), actualEnd.getMonth(), 1);

        while (cur <= last) {
            const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
            monthMap.set(key, 0);
            cur.setMonth(cur.getMonth() + 1);
        }

        filtered.forEach(s => {
            const d = new Date(s.data);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (monthMap.has(key)) monthMap.set(key, monthMap.get(key) + s.importo);
        });

        const labels = [];
        const data = [];
        const multiYear = start.getFullYear() !== actualEnd.getFullYear();

        for (const [key, val] of monthMap) {
            const [y, m] = key.split('-');
            const d = new Date(Number(y), Number(m) - 1, 1);

            labels.push(
                d.toLocaleDateString(
                    'it-IT',
                    multiYear ? { month: 'short', year: '2-digit' } : { month: 'short' }
                )
            );
            data.push(Math.round(val * 100) / 100);
        }

        return { labels, data };
    },

    getChartThemeColors() {
        const s = getComputedStyle(document.documentElement);

        return {
            text: s.getPropertyValue('--text-primary').trim(),
            textMuted: s.getPropertyValue('--text-tertiary').trim(),
            accent: s.getPropertyValue('--accent').trim(),
            cardBg: s.getPropertyValue('--bg-card').trim(),
            grid: s.getPropertyValue('--border').trim()
        };
    },

    destroyCharts() {
        if (this.chartDoughnut) {
            this.chartDoughnut.destroy();
            this.chartDoughnut = null;
        }

        if (this.chartBar) {
            this.chartBar.destroy();
            this.chartBar = null;
        }
    },

    /* =====================
       SETTINGS
       ===================== */
    renderSettings() {
        const settings = Storage.getSettings();
        const spese = Storage.getSpese();
        const sizeKB = Storage.getStorageSizeKB();
        const container = document.getElementById('settings-content');

        let dateRange = '—';
        if (spese.length > 0) {
            const dates = spese.map(s => new Date(s.data)).sort((a, b) => a - b);
            dateRange = `${dates[0].toLocaleDateString('it-IT')} — ${dates[dates.length - 1].toLocaleDateString('it-IT')}`;
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
                <p class="settings-hint">JSON per backup completo, CSV per Excel/Sheets.</p>
                <div class="settings-buttons">
                    <button id="btn-export-json" class="btn btn-secondary">📋 JSON</button>
                    <button id="btn-export-csv" class="btn btn-secondary">📄 CSV</button>
                </div>
            </div>

            <div class="settings-section">
                <h3>📥 Importa dati</h3>
                <p class="settings-hint">JSON sostituisce i dati, CSV li aggiunge.</p>
                <input type="file" id="import-file" accept=".json,.csv" hidden>
                <button id="btn-import" class="btn btn-secondary btn-block">📁 Scegli file...</button>
            </div>

            <div class="settings-section">
                <h3>📊 Informazioni</h3>
                <div class="info-grid">
                    <div class="info-item"><span class="info-label">Spese registrate</span><span class="info-value">${spese.length}</span></div>
                    <div class="info-item"><span class="info-label">Periodo</span><span class="info-value">${dateRange}</span></div>
                    <div class="info-item"><span class="info-label">Spazio usato</span><span class="info-value">${sizeKB.toFixed(1)} KB</span></div>
                </div>
            </div>

            <div class="settings-section danger-zone">
                <h3>⚠️ Zona pericolosa</h3>
                <p class="settings-hint">Azione irreversibile. Esporta prima!</p>
                <button id="btn-clear-all" class="btn btn-danger btn-block">🗑️ Cancella tutti i dati</button>
            </div>

            <div class="about-section">
                <p>💰 SpesaTracker v2.1</p>
                <p>Dati locali · Nessun server · Nessun costo</p>
            </div>
        `;

        container.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.applyTheme(btn.dataset.theme);
                Storage.updateSettings({ tema: btn.dataset.theme });
                this.renderSettings();
            });
        });

        container.querySelector('#btn-export-json').addEventListener('click', () => {
            this.download(Storage.exportJSON(), `spese_backup_${this.dateStamp()}.json`, 'application/json');
            this.showToast('Backup JSON scaricato ✓', 'success');
        });

        container.querySelector('#btn-export-csv').addEventListener('click', () => {
            this.download('\uFEFF' + Storage.exportCSV(), `spese_${this.dateStamp()}.csv`, 'text/csv;charset=utf-8');
            this.showToast('CSV scaricato ✓', 'success');
        });

        const fileInput = container.querySelector('#import-file');

        container.querySelector('#btn-import').addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();

            reader.onload = ev => {
                const content = ev.target.result;

                if (file.name.endsWith('.json')) {
                    this.showConfirm('Importare backup JSON? I dati attuali verranno SOSTITUITI.', () => {
                        const r = Storage.importJSON(content);

                        if (r.success) {
                            this.showToast(`Importate ${r.count} spese ✓`, 'success');
                            this.renderTimeline();
                            this.renderSettings();
                        } else {
                            this.showToast('Errore: ' + r.error, 'error');
                        }
                    });
                } else if (file.name.endsWith('.csv')) {
                    const r = Storage.importCSV(content);

                    if (r.success) {
                        this.showToast(`Importate ${r.count} spese ✓`, 'success');
                        this.renderTimeline();
                        this.renderSettings();
                    } else {
                        this.showToast('Errore: ' + r.error, 'error');
                    }
                } else {
                    this.showToast('Usa .json o .csv', 'error');
                }

                fileInput.value = '';
            };

            reader.readAsText(file);
        });

        container.querySelector('#btn-clear-all').addEventListener('click', () => {
            this.showConfirm('Eliminare TUTTI i dati?', () => {
                Storage.clearAll();
                this.renderTimeline();
                this.renderSettings();
                this.showToast('Dati eliminati', 'info');
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
       HELPERS
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
            .sort()
            .reverse()
            .map(date => ({
                date,
                spese: groups[date].sort((a, b) => new Date(b.data) - new Date(a.data))
            }));
    },

    dateKey(d) {
        return (
            d.getFullYear() +
            '-' +
            String(d.getMonth() + 1).padStart(2, '0') +
            '-' +
            String(d.getDate()).padStart(2, '0')
        );
    },

    formatDayLabel(dateKey) {
        const oggi = this.dateKey(new Date());
        const ieri = this.dateKey(new Date(Date.now() - 86400000));

        if (dateKey === oggi) return '📌 Oggi';
        if (dateKey === ieri) return 'Ieri';

        return new Date(dateKey + 'T12:00:00').toLocaleDateString('it-IT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
    },

    toInputDate(d) {
        return (
            d.getFullYear() +
            '-' +
            String(d.getMonth() + 1).padStart(2, '0') +
            '-' +
            String(d.getDate()).padStart(2, '0')
        );
    },

    toInputTime(d) {
        return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
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
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }
};

/* --- Boot --- */
document.addEventListener('DOMContentLoaded', () => App.init());