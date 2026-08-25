"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.periodDateRange = periodDateRange;
exports.priorPeriodDateRange = priorPeriodDateRange;
function startOfLocalDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function startOfCalendarWeek(d) {
    const start = startOfLocalDay(d);
    start.setDate(start.getDate() - start.getDay());
    return start;
}
function endOfCalendarWeek(d) {
    const end = startOfCalendarWeek(d);
    end.setDate(end.getDate() + 6);
    return end;
}
function toIsoDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
function periodDateRange(period, today = new Date()) {
    const now = startOfLocalDay(today);
    if (period === 'week') {
        return { start: toIsoDate(startOfCalendarWeek(now)), end: toIsoDate(endOfCalendarWeek(now)) };
    }
    if (period === 'week2') {
        const start = startOfCalendarWeek(now);
        start.setDate(start.getDate() - 7);
        return { start: toIsoDate(start), end: toIsoDate(endOfCalendarWeek(now)) };
    }
    if (period === 'week3') {
        const start = startOfCalendarWeek(now);
        start.setDate(start.getDate() - 14);
        return { start: toIsoDate(start), end: toIsoDate(endOfCalendarWeek(now)) };
    }
    if (period === 'q90') {
        const start = startOfLocalDay(now);
        start.setDate(start.getDate() - 90);
        return { start: toIsoDate(start), end: toIsoDate(now) };
    }
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: toIsoDate(start), end: toIsoDate(end) };
}
function priorPeriodDateRange(period, today = new Date()) {
    const current = periodDateRange(period, today);
    const start = new Date(current.start);
    const end = new Date(current.end);
    const lengthDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    const priorEnd = new Date(start);
    priorEnd.setDate(priorEnd.getDate() - 1);
    const priorStart = new Date(priorEnd);
    priorStart.setDate(priorStart.getDate() - (lengthDays - 1));
    return { start: toIsoDate(priorStart), end: toIsoDate(priorEnd) };
}
//# sourceMappingURL=period.util.js.map