import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { GoogleAuthClientService } from './google-auth-client.service';
import { DateRange } from '../metrics/period.util';

export interface OrganicSummary {
  traffic: number; // organic-channel sessions, current period
  growth: number | null; // % change vs the prior period of equal length; null if not computable
  leads: number; // organic-channel conversions, current period
}

export interface SiteSummary {
  sessions: number; // whole-property sessions, all channels, current period
  engagementRate: number; // %, 0-100
  bounceRate: number; // %, 0-100
}

// Wraps the GA4 Data API (analyticsdata.googleapis.com), NOT the deprecated
// Universal Analytics API. All numbers are scoped to the "Organic Search" default
// channel group, matching what the SEO & Organic card means by "traffic"/"leads".
// Returns null (not a throw) when unavailable — no connected account, no access to
// this property, or the call errors — so the caller renders "-" rather than a guess.
// A confirmed-zero period (property connected, genuinely no organic sessions) still
// returns a real object with traffic: 0 — that's data, not "unavailable".
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private domainMapCache: { at: number; map: Map<string, string> } | null = null;
  private readonly domainMapTtlMs = 30 * 60 * 1000; // 30 min — this enumerates every accessible property + its streams, expensive to redo often

  constructor(private readonly googleAuth: GoogleAuthClientService) {}

  async getOrganicSummary(
    propertyId: string,
    current: DateRange,
    prior: DateRange,
  ): Promise<OrganicSummary | null> {
    const auth = this.googleAuth.getAuthorizedClient();
    if (!auth) return null;

    try {
      const analyticsdata = google.analyticsdata({ version: 'v1beta', auth });
      const property = `properties/${propertyId}`;

      const [currentRes, priorRes] = await Promise.all([
        analyticsdata.properties.runReport({
          property,
          requestBody: {
            dateRanges: [{ startDate: current.start, endDate: current.end }],
            dimensions: [{ name: 'sessionDefaultChannelGroup' }],
            metrics: [{ name: 'sessions' }, { name: 'conversions' }],
          },
        }),
        analyticsdata.properties.runReport({
          property,
          requestBody: {
            dateRanges: [{ startDate: prior.start, endDate: prior.end }],
            dimensions: [{ name: 'sessionDefaultChannelGroup' }],
            metrics: [{ name: 'sessions' }],
          },
        }),
      ]);

      const organicRow = (rows: { dimensionValues?: { value?: string | null }[] | null; metricValues?: { value?: string | null }[] | null }[] | undefined) =>
        rows?.find((r) => r.dimensionValues?.[0]?.value === 'Organic Search');

      const currentRow = organicRow(currentRes.data.rows ?? undefined);
      const priorRow = organicRow(priorRes.data.rows ?? undefined);

      const traffic = Number(currentRow?.metricValues?.[0]?.value ?? 0);
      const leads = Number(currentRow?.metricValues?.[1]?.value ?? 0);
      const priorTraffic = Number(priorRow?.metricValues?.[0]?.value ?? 0);
      const growth = priorTraffic > 0 ? ((traffic - priorTraffic) / priorTraffic) * 100 : null;

      return { traffic, growth, leads };
    } catch (e) {
      this.logger.warn(`GA4 runReport failed for property ${propertyId}: ${(e as Error).message}`);
      return null;
    }
  }

  // Whole-property totals (no channel-group filter) for the CRO & Website / Organic
  // Social cards' "Website Sessions", "Bounce Rate" and "Engagement Rate" fields —
  // deliberately NOT organic-only, unlike getOrganicSummary above. GA4 reports these
  // rates as 0-1 fractions; converted to 0-100 here to match the dashboard's %
  // formatting everywhere else.
  async getSiteSummary(propertyId: string, current: DateRange): Promise<SiteSummary | null> {
    const auth = this.googleAuth.getAuthorizedClient();
    if (!auth) return null;

    try {
      const analyticsdata = google.analyticsdata({ version: 'v1beta', auth });
      const res = await analyticsdata.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: current.start, endDate: current.end }],
          metrics: [{ name: 'sessions' }, { name: 'engagementRate' }, { name: 'bounceRate' }],
        },
      });
      const row = res.data.rows?.[0];
      if (!row) return { sessions: 0, engagementRate: 0, bounceRate: 0 };
      return {
        sessions: Number(row.metricValues?.[0]?.value ?? 0),
        engagementRate: Number(row.metricValues?.[1]?.value ?? 0) * 100,
        bounceRate: Number(row.metricValues?.[2]?.value ?? 0) * 100,
      };
    } catch (e) {
      this.logger.warn(`GA4 site-summary runReport failed for property ${propertyId}: ${(e as Error).message}`);
      return null;
    }
  }

  // Auto-matches a GA4 Property ID from a domain (e.g. a client's GSC Site URL),
  // using the Google Analytics ADMIN API (analyticsadmin.googleapis.com — a
  // separate API from the Data API above, must be enabled in GCP Console
  // alongside Search Console/Analytics Data/Ads). Every web Data Stream has an
  // explicit `defaultUri` field — the actual site URL the stream tracks — which is
  // a reliable, structural way to tie a property to a domain (unlike Google Ads,
  // which has no equivalent per-account domain field). Requires enumerating every
  // accessible property's streams, so the full domain→property map is cached for
  // domainMapTtlMs and reused across lookups rather than rebuilt per client.
  async findPropertyIdForDomain(domain: string): Promise<string | null> {
    const auth = this.googleAuth.getAuthorizedClient();
    if (!auth) return null;
    try {
      const map = await this.getDomainToPropertyMap(auth);
      return map.get(this.normalizeDomain(domain)) ?? null;
    } catch (e) {
      this.logger.warn(`GA4 domain auto-match failed for ${domain}: ${(e as Error).message}`);
      return null;
    }
  }

  private async getDomainToPropertyMap(auth: ReturnType<GoogleAuthClientService['getAuthorizedClient']>): Promise<Map<string, string>> {
    if (this.domainMapCache && Date.now() - this.domainMapCache.at < this.domainMapTtlMs) {
      return this.domainMapCache.map;
    }
    const analyticsadmin = google.analyticsadmin({ version: 'v1beta', auth: auth! });
    const map = new Map<string, string>();

    const summaries = await analyticsadmin.accountSummaries.list({ pageSize: 200 });
    const propertyIds = (summaries.data.accountSummaries ?? [])
      .flatMap((a) => a.propertySummaries ?? [])
      .map((p) => p.property?.replace('properties/', ''))
      .filter((id): id is string => !!id);

    await Promise.all(
      propertyIds.map(async (propertyId) => {
        try {
          const streams = await analyticsadmin.properties.dataStreams.list({ parent: `properties/${propertyId}` });
          for (const s of streams.data.dataStreams ?? []) {
            const uri = s.webStreamData?.defaultUri;
            if (uri) map.set(this.normalizeDomain(uri), propertyId);
          }
        } catch {
          // Some properties may not expose streams to this account level — skip, not fatal.
        }
      }),
    );

    this.logger.log(`GA4 domain auto-match map built: ${map.size} web streams across ${propertyIds.length} accessible properties.`);
    this.domainMapCache = { at: Date.now(), map };
    return map;
  }

  private normalizeDomain(input: string): string {
    return String(input || '')
      .replace(/^sc-domain:/, '')
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
      .toLowerCase();
  }
}
