import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { GoogleAuthClientService } from './google-auth-client.service';

export interface SearchConsoleTotals {
  clicks: number;
  impressions: number;
  position: number | null; // average position, lower is better; null when there were no impressions to average
}

// Wraps the Search Console Search Analytics API. Returns null (not a throw) for
// "not available" cases — no connected Google account, no site access for this
// property, or the site simply has zero rows in range — so callers can render a
// clean "-" instead of guessing. A confirmed zero-click period still returns a
// totals object (with clicks: 0), since that's real data, not "unavailable".
@Injectable()
export class SearchConsoleService {
  private readonly logger = new Logger(SearchConsoleService.name);

  constructor(private readonly googleAuth: GoogleAuthClientService) {}

  async getTotals(siteUrl: string, startDate: string, endDate: string): Promise<SearchConsoleTotals | null> {
    const auth = this.googleAuth.getAuthorizedClient();
    if (!auth) return null;

    try {
      const searchconsole = google.searchconsole({ version: 'v1', auth });
      const res = await searchconsole.searchanalytics.query({
        siteUrl,
        requestBody: { startDate, endDate, dimensions: [] },
      });
      const row = res.data.rows?.[0];
      // No row = zero impressions in range: a real "connected, nothing showed up"
      // state (clicks/impressions are meaningfully 0), but an average of zero
      // impressions isn't a meaningful position — leave it null rather than 0.
      if (!row) return { clicks: 0, impressions: 0, position: null };
      return {
        clicks: row.clicks ?? 0,
        impressions: row.impressions ?? 0,
        position: row.position ?? null,
      };
    } catch (e) {
      this.logger.warn(`GSC query failed for ${siteUrl}: ${(e as Error).message}`);
      return null;
    }
  }

  // Every property the connected Google account has verified access to — this is
  // what drives roster auto-discovery (RosterService). Excludes 'siteUnverifiedUser'
  // entries, which mean the account requested access but was never actually granted
  // it, so querying them would just fail.
  async listSites(): Promise<string[]> {
    const auth = this.googleAuth.getAuthorizedClient();
    if (!auth) return [];
    try {
      const searchconsole = google.searchconsole({ version: 'v1', auth });
      const res = await searchconsole.sites.list();
      return (res.data.siteEntry ?? [])
        .filter((s) => s.permissionLevel !== 'siteUnverifiedUser')
        .map((s) => s.siteUrl ?? '')
        .filter(Boolean);
    } catch (e) {
      this.logger.warn(`GSC sites.list failed: ${(e as Error).message}`);
      return [];
    }
  }
}
