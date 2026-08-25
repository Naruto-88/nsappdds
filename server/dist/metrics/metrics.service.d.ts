import { ClientsConfigService } from '../clients-config/clients-config.service';
import { SearchConsoleService } from '../google-api/search-console.service';
import { AnalyticsService } from '../google-api/analytics.service';
import { GoogleAdsService } from '../google-api/google-ads.service';
import { MetaAdsService } from '../google-api/meta-ads.service';
import { PeriodKey } from './period.util';
export interface SeoMetricsResponse {
    traffic: number | null;
    growth: number | null;
    leads: number | null;
    position: number | null;
    impressions: number | null;
    ctr: number | null;
    sessions: number | null;
    engagementRate: number | null;
    bounceRate: number | null;
}
export interface AdsMetricsResponse {
    spend: number | null;
    clicks: number | null;
    conversions: number | null;
    roas: number | null;
    ctr: number | null;
    qualityScore: number | null;
}
export interface MetaMetricsResponse {
    spend: number | null;
    reach: number | null;
    impressions: number | null;
    clicks: number | null;
    leads: number | null;
    cpl: number | null;
    cpc: number | null;
    ctr: number | null;
    frequency: number | null;
}
export declare class MetricsService {
    private readonly clientsConfig;
    private readonly searchConsole;
    private readonly analytics;
    private readonly googleAds;
    private readonly metaAds;
    private readonly logger;
    constructor(clientsConfig: ClientsConfigService, searchConsole: SearchConsoleService, analytics: AnalyticsService, googleAds: GoogleAdsService, metaAds: MetaAdsService);
    getSeoMetrics(sheetKey: string, period: PeriodKey): Promise<SeoMetricsResponse>;
    getAdsMetrics(sheetKey: string, period: PeriodKey): Promise<AdsMetricsResponse>;
    getMetaMetrics(sheetKey: string, period: PeriodKey): Promise<MetaMetricsResponse>;
}
