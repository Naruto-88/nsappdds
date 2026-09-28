import { RosterService } from './roster.service';
import { AnalyticsService } from '../google-api/analytics.service';
export declare class RosterController {
    private readonly roster;
    private readonly analytics;
    constructor(roster: RosterService, analytics: AnalyticsService);
    getRoster(): Promise<import("./roster.service").RosterEntry[]>;
    ga4Lookup(domain: string): Promise<{
        domain: string;
        propertyId: string | null;
    }>;
}
