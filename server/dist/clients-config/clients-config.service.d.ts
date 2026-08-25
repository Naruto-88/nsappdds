import { ConfigService } from '@nestjs/config';
export interface ClientConfigRow {
    sheetKey: string;
    name: string;
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
    };
    revTier: string;
    vertical: string;
    driPrimary: string;
    driSecondary: string;
    gscSiteUrl: string | null;
    ga4PropertyId: string | null;
    googleAdsCustomerId: string | null;
    metaAdAccountId: string | null;
}
export declare class ClientsConfigService {
    private readonly config;
    private readonly logger;
    private cache;
    private readonly cacheTtlMs;
    constructor(config: ConfigService);
    getMapping(sheetKey: string): Promise<ClientConfigRow | null>;
    getMappingBySiteUrl(gscSiteUrl: string): Promise<ClientConfigRow | null>;
    getAllRows(): Promise<ClientConfigRow[]>;
    private fetchConfigRows;
    private parseClientRows;
}
