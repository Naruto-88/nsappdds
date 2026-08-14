import { Injectable, Logger } from '@nestjs/common';
import { ClientsConfigService } from '../clients-config/clients-config.service';
import { AnalyticsService } from '../google-api/analytics.service';

export interface RosterEntry {
  sheetKey: string | null; // null when this client has no _CONFIG row — no Sheet tab to sync Meta/CRO/Social/Content/Leads/Actions from
  name: string;
  matched: boolean; // true when a _CONFIG row exists for this client
  gscSiteUrl: string | null;
  ga4PropertyId: string | null;
  ga4AutoMatched: boolean; // true when ga4PropertyId came from domain auto-matching, not the _CONFIG sheet
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

// The Portfolio roster is Sheet-driven only: every entry comes from a _CONFIG row,
// full stop. GSC properties the connected Google account can see but that have no
// matching _CONFIG row are NOT surfaced as clients — a client only appears here
// because someone added them to the sheet, not because Google happens to grant
// access to their domain. (An earlier version of this surfaced unmatched GSC
// properties as auto-discovered clients too; that's intentionally removed.)
@Injectable()
export class RosterService {
  private readonly logger = new Logger(RosterService.name);

  constructor(
    private readonly clientsConfig: ClientsConfigService,
    private readonly analytics: AnalyticsService,
  ) {}

  async getDiscoveredRoster(): Promise<RosterEntry[]> {
    const configRows = await this.clientsConfig.getAllRows();

    const entries: RosterEntry[] = configRows.map((r) => ({
      sheetKey: r.sheetKey,
      name: r.name,
      matched: true,
      gscSiteUrl: r.gscSiteUrl,
      ga4PropertyId: r.ga4PropertyId,
      ga4AutoMatched: false,
      googleAdsCustomerId: r.googleAdsCustomerId,
      baselines: r.baselines,
      revTier: r.revTier,
      vertical: r.vertical,
      driPrimary: r.driPrimary,
      driSecondary: r.driSecondary,
    }));

    // GA4 Property ID auto-match still runs per client, using that client's own
    // GSC Site URL from the sheet (column R) — this is unaffected by dropping the
    // "surface unknown properties as clients" behavior above, since it only ever
    // looks up a domain that's already tied to a real sheet row.
    await Promise.all(
      entries.map(async (entry) => {
        if (entry.ga4PropertyId || !entry.gscSiteUrl) return;
        const matched = await this.analytics.findPropertyIdForDomain(entry.gscSiteUrl);
        if (matched) {
          entry.ga4PropertyId = matched;
          entry.ga4AutoMatched = true;
          this.logger.log(`Auto-matched GA4 property ${matched} to ${entry.name} via domain ${entry.gscSiteUrl}`);
        }
      }),
    );

    return entries;
  }
}
