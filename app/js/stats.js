/* ============================================
   STATS - Date, riepiloghi e aggregazioni pure
   ============================================ */

const StatsData = (() => {
    const DAY_MS = 86400000;

    function dateKey(date) {
        const d = new Date(date);
        return (
            d.getFullYear() +
            '-' +
            String(d.getMonth() + 1).padStart(2, '0') +
            '-' +
            String(d.getDate()).padStart(2, '0')
        );
    }

    function roundMoney(value) {
        return Math.round(Number(value || 0) * 100) / 100;
    }

    function startOfWeek(date) {
        const d = new Date(date);
        const day = (d.getDay() + 6) % 7;
        d.setDate(d.getDate() - day);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    function getDataBounds(spese) {
        const list = Array.isArray(spese) ? spese : [];
        if (!list.length) return null;

        const times = list
            .map(spesa => new Date(spesa.data).getTime())
            .filter(time => Number.isFinite(time));

        if (!times.length) return null;

        const start = new Date(Math.min(...times));
        const end = new Date(Math.max(...times));

        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        return { start, end };
    }

    function getPeriodDates(options = {}) {
        const period = options.period || 'month';
        const offset = Number.isFinite(Number(options.offset)) ? Number(options.offset) : 0;
        const filters = options.filters || {};
        const spese = Array.isArray(options.spese) ? options.spese : [];
        const now = options.now ? new Date(options.now) : new Date();
        let start;
        let end;
        let label;

        switch (period) {
            case 'week': {
                const ref = new Date(now);
                ref.setDate(ref.getDate() + offset * 7);

                start = startOfWeek(ref);
                end = new Date(start);
                end.setDate(end.getDate() + 6);
                end.setHours(23, 59, 59, 999);

                const sl = start.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
                const el = end.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
                label = `${sl} \u2014 ${el}`;
                break;
            }

            case 'month': {
                const ref = new Date(now.getFullYear(), now.getMonth() + offset, 1);

                start = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
                end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
                label = ref.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
                break;
            }

            case 'year': {
                const year = now.getFullYear() + offset;

                start = new Date(year, 0, 1, 0, 0, 0, 0);
                end = new Date(year, 11, 31, 23, 59, 59, 999);
                label = year.toString();
                break;
            }

            case 'custom': {
                const df = String(filters.dateFrom || '').trim();
                const dt = String(filters.dateTo || '').trim();
                const bounds = getDataBounds(spese);

                if (df) {
                    start = new Date(`${df}T00:00:00`);
                } else if (bounds) {
                    start = new Date(bounds.start);
                } else {
                    start = new Date(now);
                    start.setHours(0, 0, 0, 0);
                }

                if (dt) {
                    end = new Date(`${dt}T23:59:59`);
                } else if (bounds) {
                    end = new Date(bounds.end);
                } else {
                    end = new Date(now);
                    end.setHours(23, 59, 59, 999);
                }

                if (df && dt) {
                    const sl = start.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
                    const el = end.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
                    label = `${sl} \u2014 ${el}`;
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
    }

    function getActualPeriodEnd(end, now) {
        const ref = now ? new Date(now) : new Date();
        return new Date(Math.min(new Date(end).getTime(), ref.getTime()));
    }

    function getRangeDays(start, end, now) {
        const actualEnd = getActualPeriodEnd(end, now);
        const diff = actualEnd.getTime() - new Date(start).getTime();
        if (diff < 0) return 1;
        return Math.max(1, Math.floor(diff / DAY_MS) + 1);
    }

    function getBarAggregation(options = {}) {
        if (options.period === 'year') return 'month';

        const rangeDays = getRangeDays(options.start, options.end, options.now);

        if (rangeDays > 365) return 'month';
        if (rangeDays > 90) return 'week';
        return 'day';
    }

    function getBarChartTitle(options = {}) {
        const aggregation = options.aggregation || getBarAggregation(options);

        if (aggregation === 'month') return 'Andamento mensile';
        if (aggregation === 'week') return 'Andamento settimanale';
        return 'Andamento giornaliero';
    }

    function getCategoryTotals(spese) {
        const totals = {};
        const list = Array.isArray(spese) ? spese : [];

        list.forEach(spesa => {
            const amount = Number(spesa.importo);
            totals[spesa.categoria] = (totals[spesa.categoria] || 0) + (Number.isFinite(amount) ? amount : 0);
        });

        return totals;
    }

    function getSortedCategoryTotals(spese) {
        return Object.entries(getCategoryTotals(spese))
            .map(([id, amount]) => [id, roundMoney(amount)])
            .sort((a, b) => b[1] - a[1]);
    }

    function getTopExpenses(spese, limit = 5) {
        const list = Array.isArray(spese) ? spese : [];
        return [...list]
            .sort((a, b) => Number(b.importo || 0) - Number(a.importo || 0))
            .slice(0, limit);
    }

    function summarizeExpenses(spese, start, end, options = {}) {
        const list = Array.isArray(spese) ? spese : [];
        const total = roundMoney(list.reduce((sum, spesa) => sum + Number(spesa.importo || 0), 0));
        const days = getRangeDays(start, end, options.now);
        const categoryTotals = getSortedCategoryTotals(list);

        return {
            total,
            days,
            avg: total / days,
            categoryTotals,
            maxCategory: categoryTotals.length > 0 ? categoryTotals[0][1] : 1,
            topExpenses: getTopExpenses(list, options.topLimit || 5)
        };
    }

    function buildDailyBarData(spese, start, end, options = {}) {
        const dayMap = new Map();
        const cur = new Date(start);
        const actualEnd = getActualPeriodEnd(end, options.now);

        cur.setHours(0, 0, 0, 0);

        while (cur <= actualEnd) {
            dayMap.set(dateKey(cur), 0);
            cur.setDate(cur.getDate() + 1);
        }

        (Array.isArray(spese) ? spese : []).forEach(spesa => {
            const key = dateKey(new Date(spesa.data));
            const amount = Number(spesa.importo);
            if (dayMap.has(key)) dayMap.set(key, dayMap.get(key) + (Number.isFinite(amount) ? amount : 0));
        });

        const labels = [];
        const data = [];
        const numDays = dayMap.size;

        for (const [key, val] of dayMap) {
            const d = new Date(`${key}T12:00:00`);

            if (numDays <= 14) {
                labels.push(d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' }));
            } else if (numDays <= 62) {
                labels.push(d.getDate().toString());
            } else {
                labels.push(d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }));
            }

            data.push(roundMoney(val));
        }

        return { labels, data };
    }

    function buildWeeklyBarData(spese, start, end, options = {}) {
        const weekMap = new Map();
        const actualEnd = getActualPeriodEnd(end, options.now);

        let cur = startOfWeek(start);
        const last = startOfWeek(actualEnd);

        while (cur <= last) {
            weekMap.set(dateKey(cur), 0);
            cur.setDate(cur.getDate() + 7);
        }

        (Array.isArray(spese) ? spese : []).forEach(spesa => {
            const weekStart = startOfWeek(new Date(spesa.data));
            const key = dateKey(weekStart);
            const amount = Number(spesa.importo);
            if (weekMap.has(key)) weekMap.set(key, weekMap.get(key) + (Number.isFinite(amount) ? amount : 0));
        });

        const labels = [];
        const data = [];
        const multiYear = new Date(start).getFullYear() !== actualEnd.getFullYear();

        for (const [key, val] of weekMap) {
            const ws = new Date(`${key}T12:00:00`);
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

            labels.push(`${labelStart}\u2013${labelEnd}`);
            data.push(roundMoney(val));
        }

        return { labels, data };
    }

    function buildMonthlyBarData(spese, start, end, options = {}) {
        const monthMap = new Map();
        const actualEnd = getActualPeriodEnd(end, options.now);

        let cur = new Date(new Date(start).getFullYear(), new Date(start).getMonth(), 1);
        const last = new Date(actualEnd.getFullYear(), actualEnd.getMonth(), 1);

        while (cur <= last) {
            const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
            monthMap.set(key, 0);
            cur.setMonth(cur.getMonth() + 1);
        }

        (Array.isArray(spese) ? spese : []).forEach(spesa => {
            const d = new Date(spesa.data);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const amount = Number(spesa.importo);
            if (monthMap.has(key)) monthMap.set(key, monthMap.get(key) + (Number.isFinite(amount) ? amount : 0));
        });

        const labels = [];
        const data = [];
        const multiYear = new Date(start).getFullYear() !== actualEnd.getFullYear();

        for (const [key, val] of monthMap) {
            const [y, m] = key.split('-');
            const d = new Date(Number(y), Number(m) - 1, 1);

            labels.push(
                d.toLocaleDateString(
                    'it-IT',
                    multiYear ? { month: 'short', year: '2-digit' } : { month: 'short' }
                )
            );
            data.push(roundMoney(val));
        }

        return { labels, data };
    }

    function buildBarData(spese, start, end, options = {}) {
        const aggregation = options.aggregation || getBarAggregation({
            period: options.period,
            start,
            end,
            now: options.now
        });

        if (aggregation === 'month') return buildMonthlyBarData(spese, start, end, options);
        if (aggregation === 'week') return buildWeeklyBarData(spese, start, end, options);
        return buildDailyBarData(spese, start, end, options);
    }

    function getQuickTotals(spese, now) {
        const today = now ? new Date(now) : new Date();
        const todayKey = dateKey(today);
        const month = today.getMonth();
        const year = today.getFullYear();
        const monday = startOfWeek(today);
        let todayTotal = 0;
        let weekTotal = 0;
        let monthTotal = 0;

        (Array.isArray(spese) ? spese : []).forEach(spesa => {
            const d = new Date(spesa.data);
            const amount = Number(spesa.importo);
            const safeAmount = Number.isFinite(amount) ? amount : 0;

            if (dateKey(d) === todayKey) todayTotal += safeAmount;
            if (d >= monday) weekTotal += safeAmount;
            if (d.getMonth() === month && d.getFullYear() === year) monthTotal += safeAmount;
        });

        const monthName = today.toLocaleString('it-IT', { month: 'long' });

        return {
            todayTotal: roundMoney(todayTotal),
            weekTotal: roundMoney(weekTotal),
            monthTotal: roundMoney(monthTotal),
            monthName,
            monthNameCapitalized: monthName.charAt(0).toUpperCase() + monthName.slice(1)
        };
    }

    function groupByDay(spese) {
        const groups = {};

        (Array.isArray(spese) ? spese : []).forEach(spesa => {
            const key = dateKey(new Date(spesa.data));
            if (!groups[key]) groups[key] = [];
            groups[key].push(spesa);
        });

        return Object.keys(groups)
            .sort()
            .reverse()
            .map(date => ({
                date,
                spese: groups[date].sort((a, b) => new Date(b.data) - new Date(a.data))
            }));
    }

    return {
        dateKey,
        roundMoney,
        startOfWeek,
        getDataBounds,
        getPeriodDates,
        getActualPeriodEnd,
        getRangeDays,
        getBarAggregation,
        getBarChartTitle,
        getCategoryTotals,
        getSortedCategoryTotals,
        getTopExpenses,
        summarizeExpenses,
        buildDailyBarData,
        buildWeeklyBarData,
        buildMonthlyBarData,
        buildBarData,
        getQuickTotals,
        groupByDay
    };
})();
