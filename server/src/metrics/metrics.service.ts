import { Injectable, Logger } from '@nestjs/common';
import { ClientsConfigService } from '../clients-config/clients-config.service';
import { SearchConsoleService } from '../google-api/search-console.service';
import { AnalyticsService } from '../google-api/analytics.service';
import { GoogleAdsService } from '../google-api/google-ads.service';
import { PeriodKey, periodDateRange, priorPeriodDateRange } from './period.util';

export interface SeoMetricsResponse {
  traffic: number | null; // GA4 organic-channel sessions
  growth: number | null; // % change vs prior period (GA4)
  leads: number | null; // GA4 organic-channel conversions
  position: number | null; // GSC average position
  impressions: number | null; // GSC
  ctr: number | null; // GSC, %, clicks/impressions
  sessions: number | null; // GA4, whole-property (not organic-only) — "Website Sessions"
  engagementRate: number | null; // GA4, whole-property, %
  bounceRate: number | null; // GA4, whole-property, %
}

export interface AdsMetricsResponse {
  spend: number | null;
  clicks: number | null;
  conversions: number | null;
  roas: number | null;
  ctr: number | null;
  qualityScore: number | null;
}

// Assembles live Google-sourced fields per client/period. Each field is
// independently null when that client has no mapped property (or the call fails)
// — never falls back to a guess. Domain Authority, New Backlinks, A/B Tests, Avg
// Time, Posts/Reach/Top Platform are NOT part of any response here on purpose:
// no Google API provides them, so the dashboard keeps reading those straight from
// the Sheet, unchanged.
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(
    private readonly clientsConfig: ClientsConfigService,
    private readonly searchConsole: SearchConsoleService,
    private readonly analytics: AnalyticsService,
    private readonly googleAds: GoogleAdsService,
  ) {}

  async getSeoMetrics(sheetKey: string, period: PeriodKey): Promise<SeoMetricsResponse> {
    const mapping = await this.clientsConfig.getMapping(sheetKey);
    const current = periodDateRange(period);
    const prior = priorPeriodDateRange(period);

    if (!mapping) {
      this.logger.warn(
        `No _CONFIG row found for sheetKey "${sheetKey}" — check it matches the client's Client ID column exactly.`,
      );
    } else if (!mapping.gscSiteUrl && !mapping.ga4PropertyId) {
      this.logger.warn(`"${sheetKey}" has a _CONFIG row but no GSC Site URL / GA4 Property ID filled in yet.`);
    }

    // GA4 Property ID falls back to a live domain auto-match (via GSC Site URL)
    // when the _CONFIG sheet doesn't have one filled in yet — same lookup
    // RosterService uses to surface it in the client list. Google Ads has no
    // reliable domain-based match, so its Customer ID stays sheet-only.
    let ga4PropertyId = mapping?.ga4PropertyId ?? null;
    if (!ga4PropertyId && mapping?.gscSiteUrl) {
      ga4PropertyId = await this.analytics.findPropertyIdForDomain(mapping.gscSiteUrl);
    }

    const [gsc, ga4Organic, ga4Site] = await Promise.all([
      mapping?.gscSiteUrl
        ? this.searchConsole.getTotals(mapping.gscSiteUrl, current.start, current.end)
        : Promise.resolve(null),
      ga4PropertyId ? this.analytics.getOrganicSummary(ga4PropertyId, current, prior) : Promise.resolve(null),
      ga4PropertyId ? this.analytics.getSiteSummary(ga4PropertyId, current) : Promise.resolve(null),
    ]);

    this.logger.log(
      `SEO metrics for "${sheetKey}" [${period}, ${current.start}..${current.end}]: ` +
        `gsc=${mapping?.gscSiteUrl ? (gsc ? 'ok' : 'FAILED') : 'not mapped'}, ` +
        `ga4=${ga4PropertyId ? (ga4Organic ? `ok${mapping?.ga4PropertyId ? '' : ' (auto-matched)'}` : 'FAILED') : 'not mapped'}` +
        (ga4Organic ? ` -> traffic=${ga4Organic.traffic}, leads=${ga4Organic.leads}` : '') +
        (gsc ? `, position=${gsc.position}, impressions=${gsc.impressions}` : ''),
    );

    return {
      traffic: ga4Organic ? ga4Organic.traffic : null,
      growth: ga4Organic ? ga4Organic.growth : null,
      leads: ga4Organic ? ga4Organic.leads : null,
      position: gsc ? gsc.position : null,
      impressions: gsc ? gsc.impressions : null,
      ctr: gsc && gsc.impressions > 0 ? (gsc.clicks / gsc.impressions) * 100 : gsc ? 0 : null,
      sessions: ga4Site ? ga4Site.sessions : null,
      engagementRate: ga4Site ? ga4Site.engagementRate : null,
      bounceRate: ga4Site ? ga4Site.bounceRate : null,
    };
  }

  async getAdsMetrics(sheetKey: string, period: PeriodKey): Promise<AdsMetricsResponse> {
    const mapping = await this.clientsConfig.getMapping(sheetKey);
    const current = periodDateRange(period);

    if (mapping && !mapping.googleAdsCustomerId) {
      this.logger.warn(`"${sheetKey}" has a _CONFIG row but no Google Ads Customer ID filled in yet.`);
    }

    const ads = mapping?.googleAdsCustomerId
      ? await this.googleAds.getAccountSummary(mapping.googleAdsCustomerId, current)
      : null;

    this.logger.log(
      `Ads metrics for "${sheetKey}" [${period}]: ${mapping?.googleAdsCustomerId ? (ads ? 'ok' : 'FAILED') : 'not mapped'}` +
        (ads ? ` -> spend=${ads.spend}, clicks=${ads.clicks}, conversions=${ads.conversions}` : ''),
    );

    return {
      spend: ads ? ads.spend : null,
      clicks: ads ? ads.clicks : null,
      conversions: ads ? ads.conversions : null,
      roas: ads ? ads.roas : null,
      ctr: ads ? ads.ctr : null,
      qualityScore: ads ? ads.qualityScore : null,
    };
  }
}
