import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuthClientService } from './google-auth-client.service';
import { DateRange } from '../metrics/period.util';

export interface AdsAccountSummary {
  spend: number; // $
  clicks: number;
  conversions: number;
  roas: number | null; // conversions_value / spend; null when spend is 0 (can't divide)
  ctr: number; // %, 0-100
  qualityScore: number | null; // 1-10, averaged across active enabled keywords in period — see note below
}

interface GAdsSearchRow {
  metrics?: {
    costMicros?: string;
    clicks?: string;
    conversions?: string;
    conversionsValue?: string;
    ctr?: string;
  };
  adGroupCriterion?: { qualityInfo?: { qualityScore?: number } };
}

const API_VERSION = 'v25';
const BASE_URL = `https://googleads.googleapis.com/${API_VERSION}`;

// Raw REST calls to the Google Ads API — it isn't part of the `googleapis` client
// library (a separate product with its own developer-token gated access), so this
// wraps fetch() directly using the same OAuth2 client GSC/GA4 already authenticate
// with (Ads just needs the extra 'adwords' scope + a developer token). Returns null
// (not a throw) whenever unavailable — no connection, no developer token yet, no
// access to this customer — same contract as SearchConsoleService/AnalyticsService.
//
// Quality Score isn't an account-level metric in the Google Ads API — it only exists
// per-keyword (ad_group_criterion.quality_info.quality_score). The number here is an
// average across that customer's active, enabled keywords with a quality score in
// range, not a single platform-reported figure.
@Injectable()
export class GoogleAdsService {
  private readonly logger = new Logger(GoogleAdsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly googleAuth: GoogleAuthClientService,
  ) {}

  private async authHeaders(): Promise<Record<string, string> | null> {
    const client = this.googleAuth.getAuthorizedClient();
    if (!client) return null;
    const developerToken = this.config.get<string>('GOOGLE_ADS_DEVELOPER_TOKEN');
    if (!developerToken) {
      this.logger.warn('GOOGLE_ADS_DEVELOPER_TOKEN not set — Google Ads calls skipped until it is.');
      return null;
    }
    const { token } = await client.getAccessToken();
    if (!token) return null;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'developer-token': developerToken,
      'Content-Type': 'application/json',
    };
    const loginCustomerId = this.config.get<string>('GOOGLE_ADS_LOGIN_CUSTOMER_ID');
    if (loginCustomerId) headers['login-customer-id'] = loginCustomerId.replace(/-/g, '');
    return headers;
  }

  private async search(customerId: string, headers: Record<string, string>, query: string): Promise<GAdsSearchRow[]> {
    const res = await fetch(`${BASE_URL}/customers/${customerId}/googleAds:search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { results?: GAdsSearchRow[] };
    return data.results ?? [];
  }

  // Every customer account the connected identity can access under the configured
  // MCC — drives the same kind of auto-discovery pattern as GSC's listSites(), for
  // when you want to cross-check which of your Ads accounts are actually reachable.
  async listAccessibleCustomers(): Promise<string[]> {
    const headers = await this.authHeaders();
    if (!headers) return [];
    try {
      const res = await fetch(`${BASE_URL}/customers:listAccessibleCustomers`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as { resourceNames?: string[] };
      return (data.resourceNames ?? []).map((rn) => rn.replace('customers/', ''));
    } catch (e) {
      this.logger.warn(`listAccessibleCustomers failed: ${(e as Error).message}`);
      return [];
    }
  }

  async getAccountSummary(customerId: string, current: DateRange): Promise<AdsAccountSummary | null> {
    const headers = await this.authHeaders();
    if (!headers) return null;
    const cid = customerId.replace(/-/g, '');

    try {
      const rows = await this.search(
        cid,
        headers,
        `SELECT metrics.cost_micros, metrics.clicks, metrics.conversions, metrics.conversions_value, metrics.ctr
         FROM customer
         WHERE segments.date BETWEEN '${current.start}' AND '${current.end}'`,
      );
      const row = rows[0];
      const spend = row ? Number(row.metrics?.costMicros ?? 0) / 1_000_000 : 0;
      const clicks = row ? Number(row.metrics?.clicks ?? 0) : 0;
      const conversions = row ? Number(row.metrics?.conversions ?? 0) : 0;
      const conversionsValue = row ? Number(row.metrics?.conversionsValue ?? 0) : 0;
      const ctr = row ? Number(row.metrics?.ctr ?? 0) * 100 : 0;
      const roas = spend > 0 ? conversionsValue / spend : null;

      const qualityScore = await this.getAverageQualityScore(cid, headers, current);

      return { spend, clicks, conversions, roas, ctr, qualityScore };
    } catch (e) {
      this.logger.warn(`Google Ads getAccountSummary failed for ${cid}: ${(e as Error).message}`);
      return null;
    }
  }

  private async getAverageQualityScore(
    cid: string,
    headers: Record<string, string>,
    current: DateRange,
  ): Promise<number | null> {
    try {
      const rows = await this.search(
        cid,
        headers,
        `SELECT ad_group_criterion.quality_info.quality_score
         FROM keyword_view
         WHERE segments.date BETWEEN '${current.start}' AND '${current.end}'
           AND ad_group_criterion.status = 'ENABLED'
           AND ad_group_criterion.quality_info.quality_score > 0`,
      );
      const scores = rows
        .map((r) => Number(r.adGroupCriterion?.qualityInfo?.qualityScore ?? 0))
        .filter((s) => s > 0);
      if (!scores.length) return null;
      return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
    } catch (e) {
      // Quality Score is best-effort on top of the main summary — don't fail the
      // whole card over it.
      this.logger.warn(`Quality score query failed for ${cid}: ${(e as Error).message}`);
      return null;
    }
  }
}
