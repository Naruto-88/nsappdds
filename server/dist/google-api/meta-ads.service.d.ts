import { ConfigService } from '@nestjs/config';
import { DateRange } from '../metrics/period.util';
export interface MetaAdsSummary {
    spend: number;
    reach: number;
    impressions: number;
    clicks: number;
    leads: number;
    cpl: number | null;
    cpc: number | null;
    ctr: number | null;
    frequency: number | null;
}
export declare class MetaAdsService {
    private readonly config;
    private readonly logger;
    constructor(config: ConfigService);
    private getAccessToken;
    getAccountSummary(accountId: string, current: DateRange): Promise<MetaAdsSummary | null>;
}
