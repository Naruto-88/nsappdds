export type PeriodKey = 'week' | 'week2' | 'week3' | 'month' | 'q90';

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfCalendarWeek(d: Date): Date {
  const start = startOfLocalDay(d);
  start.setDate(start.getDate() - start.getDay()); // Sunday = 0
  return start;
}

function endOfCalendarWeek(d: Date): Date {
  const end = startOfCalendarWeek(d);
  end.setDate(end.getDate() + 6);
  return end;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Mirrors periodDateRange() in index.html so the backend's date ranges line up
// exactly with the period the dashboard has selected (Sunday-start calendar weeks).
export function periodDateRange(period: PeriodKey, today: Date = new Date()): DateRange {
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
  // month
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

// The immediately-preceding period of equal length, used to compute SEO traffic
// Growth (% change vs the prior comparable window) from GA4 alone.
export function priorPeriodDateRange(period: PeriodKey, today: Date = new Date()): DateRange {
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
