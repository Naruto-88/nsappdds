export type PeriodKey = 'week' | 'week2' | 'week3' | 'month' | 'q90';
export interface DateRange {
    start: string;
    end: string;
}
export declare function periodDateRange(period: PeriodKey, today?: Date): DateRange;
export declare function priorPeriodDateRange(period: PeriodKey, today?: Date): DateRange;
