/* ============================================
   FILTERS - Logica pura condivisa
   ============================================ */

const ExpenseFilters = (() => {
    function toSet(value) {
        if (value instanceof Set) return value;
        if (
            value &&
            typeof value.size === 'number' &&
            typeof value.has === 'function' &&
            typeof value.forEach === 'function'
        ) {
            return new Set(Array.from(value).filter(Boolean));
        }
        if (Array.isArray(value)) return new Set(value.filter(Boolean));
        return new Set();
    }

    function normalize(filters = {}) {
        const rawMin = Number(filters.amountMin);
        const rawMax = filters.amountMax === Infinity ? Infinity : Number(filters.amountMax);

        return {
            query: String(filters.query || '').trim(),
            categories: toSet(filters.categories),
            methods: toSet(filters.methods),
            amountMin: Number.isFinite(rawMin) && rawMin > 0 ? rawMin : 0,
            amountMax: Number.isFinite(rawMax) && rawMax >= 0 ? rawMax : Infinity,
            dateFrom: String(filters.dateFrom || '').trim(),
            dateTo: String(filters.dateTo || '').trim()
        };
    }

    function countActive(filters = {}) {
        const state = normalize(filters);
        let count = 0;

        if (state.query) count += 1;
        if (state.categories.size > 0) count += 1;
        if (state.methods.size > 0) count += 1;
        if (state.amountMin > 0 || state.amountMax < Infinity) count += 1;
        if (state.dateFrom || state.dateTo) count += 1;

        return count;
    }

    function hasActive(filters = {}) {
        return countActive(filters) > 0;
    }

    function matchesQuery(spesa, query) {
        if (!query) return true;

        const q = query.toLowerCase();
        const descrizione = String(spesa.descrizione || '').toLowerCase();
        const nota = String(spesa.nota || '').toLowerCase();
        const tags = Array.isArray(spesa.tags) ? spesa.tags : [];

        return (
            descrizione.includes(q) ||
            nota.includes(q) ||
            tags.some(tag => String(tag || '').toLowerCase().includes(q))
        );
    }

    function matchesDateRange(spesa, state) {
        if (!state.dateFrom && !state.dateTo) return true;

        const date = new Date(spesa.data);

        if (state.dateFrom) {
            const from = new Date(`${state.dateFrom}T00:00:00`);
            if (!(date >= from)) return false;
        }

        if (state.dateTo) {
            const to = new Date(`${state.dateTo}T23:59:59`);
            if (!(date <= to)) return false;
        }

        return true;
    }

    function matchesAmount(spesa, state) {
        const amount = Number(spesa.importo);

        if (state.amountMin > 0 && !(amount >= state.amountMin)) return false;
        if (state.amountMax < Infinity && !(amount <= state.amountMax)) return false;

        return true;
    }

    function matches(spesa, filters = {}, options = {}) {
        const state = normalize(filters);
        const includeDate = options.includeDate !== false;

        if (!matchesQuery(spesa, state.query)) return false;
        if (state.categories.size > 0 && !state.categories.has(spesa.categoria)) return false;
        if (state.methods.size > 0 && !state.methods.has(spesa.metodo)) return false;
        if (!matchesAmount(spesa, state)) return false;
        if (includeDate && !matchesDateRange(spesa, state)) return false;

        return true;
    }

    function apply(spese, filters = {}, options = {}) {
        const state = normalize(filters);
        const includeDate = options.includeDate !== false;
        const list = Array.isArray(spese) ? spese : [];

        return list.filter(spesa => {
            if (!matchesQuery(spesa, state.query)) return false;
            if (state.categories.size > 0 && !state.categories.has(spesa.categoria)) return false;
            if (state.methods.size > 0 && !state.methods.has(spesa.metodo)) return false;
            if (!matchesAmount(spesa, state)) return false;
            if (includeDate && !matchesDateRange(spesa, state)) return false;
            return true;
        });
    }

    function applyNonDate(spese, filters = {}) {
        return apply(spese, filters, { includeDate: false });
    }

    return {
        normalize,
        countActive,
        hasActive,
        matches,
        apply,
        applyNonDate
    };
})();
