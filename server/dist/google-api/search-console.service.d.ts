import { GoogleAuthClientService } from './google-auth-client.service';
export interface SearchConsoleTotals {
    clicks: number;
    impressions: number;
    position: number | null;
}
export declare class SearchConsoleService {
    private readonly googleAuth;
    private readonly logger;
    constructor(googleAuth: GoogleAuthClientService);
    getTotals(siteUrl: string, startDate: string, endDate: string): Promise<SearchConsoleTotals | null>;
    listSites(): Promise<string[]>;
}
