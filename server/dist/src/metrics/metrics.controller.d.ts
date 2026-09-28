import { MetricsService } from './metrics.service';
export declare class MetricsController {
    private readonly metrics;
    constructor(metrics: MetricsService);
    getSeo(sheetKey: string, period: string): Promise<import("./metrics.service").SeoMetricsResponse>;
    getAds(sheetKey: string, period: string): Promise<import("./metrics.service").AdsMetricsResponse>;
    getMeta(sheetKey: string, period: string): Promise<import("./metrics.service").MetaMetricsResponse>;
}
