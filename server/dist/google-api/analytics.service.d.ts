import { GoogleAuthClientService } from './google-auth-client.service';
import { DateRange } from '../metrics/period.util';
export interface OrganicSummary {
    traffic: number;
    growth: number | null;
    leads: number;
}
export interface SiteSummary {
    sessions: number;
    engagementRate: number;
    bounceRate: number;
}
export declare class AnalyticsService {
    private readonly googleAuth;
    private readonly logger;
    private domainMapCache;
    private readonly domainMapTtlMs;
    constructor(googleAuth: GoogleAuthClientService);
    getOrganicSummary(propertyId: string, current: DateRange, prior: DateRange): Promise<OrganicSummary | null>;
    getSiteSummary(propertyId: string, current: DateRange): Promise<SiteSummary | null>;
    findPropertyIdForDomain(domain: string): Promise<string | null>;
    private getDomainToPropertyMap;
    private normalizeDomain;
}
