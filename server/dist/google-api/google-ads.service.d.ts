import { ConfigService } from '@nestjs/config';
import { GoogleAuthClientService } from './google-auth-client.service';
import { DateRange } from '../metrics/period.util';
export interface AdsAccountSummary {
    spend: number;
    clicks: number;
    conversions: number;
    roas: number | null;
    ctr: number;
    qualityScore: number | null;
}
export declare class GoogleAdsService {
    private readonly config;
    private readonly googleAuth;
    private readonly logger;
    constructor(config: ConfigService, googleAuth: GoogleAuthClientService);
    private authHeaders;
    private search;
    listAccessibleCustomers(): Promise<string[]>;
    getAccountSummary(customerId: string, current: DateRange): Promise<AdsAccountSummary | null>;
    private getAverageQualityScore;
}
