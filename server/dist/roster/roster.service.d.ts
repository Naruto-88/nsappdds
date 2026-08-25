import { ClientsConfigService } from '../clients-config/clients-config.service';
import { AnalyticsService } from '../google-api/analytics.service';
export interface RosterEntry {
    sheetKey: string | null;
    name: string;
    matched: boolean;
    gscSiteUrl: string | null;
    ga4PropertyId: string | null;
    ga4AutoMatched: boolean;
    googleAdsCustomerId: string | null;
    baselines: {
        leads: number;
        seoLeads: number | null;
        qualLeads: number;
        cpl: number;
        googleCPL: number;
        metaCPL: number | null;
        conv: number;
        roas: number;
        traffic: number;
    } | null;
    revTier: string | null;
    vertical: string | null;
    driPrimary: string | null;
    driSecondary: string | null;
}
export declare class RosterService {
    private readonly clientsConfig;
    private readonly analytics;
    private readonly logger;
    constructor(clientsConfig: ClientsConfigService, analytics: AnalyticsService);
    getDiscoveredRoster(): Promise<RosterEntry[]>;
}
