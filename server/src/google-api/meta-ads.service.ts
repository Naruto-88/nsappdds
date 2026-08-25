import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DateRange } from '../metrics/period.util';

export interface MetaAdsSummary {
  spend: number; // $
  reach: number;
  impressions: number;
  clicks: number;
  leads: number;
  cpl: number | null; // spend / leads
  cpc: number | null;
  ctr: number | null; // %
  frequency: number | null; // impressions / reach
}

const GRAPH_API_VERSION = 'v20.0';
const BASE_URL = 'https://graph.facebook.com/' + GRAPH_API_VERSION;

@Injectable()
export class MetaAdsService {
  private readonly logger = new Logger(MetaAdsService.name);

  constructor(private readonly config: ConfigService) {}

  private getAccessToken(): string | null {
    const token = this.config.get<string>('META_ACCESS_TOKEN');
    if (!token) {
      this.logger.warn('META_ACCESS_TOKEN not set — Meta Ads calls skipped.');
      return null;
    }
    return token.replace(/^[']|[']$/g, '').trim();
  }

  async getAccountSummary(accountId: string, current: DateRange): Promise<MetaAdsSummary | null> {
    const token = this.getAccessToken();
    if (!token) return null;

    let actId = accountId.trim();
    if (!actId.startsWith('act_')) {
      actId = 'act_' + actId;
    }

    try {
      const timeRange = JSON.stringify({ since: current.start, until: current.end });
      const fields = 'spend,impressions,reach,clicks,cpc,ctr,actions';
      const url =
        BASE_URL +
        '/' +
        actId +
        '/insights?fields=' +
        encodeURIComponent(fields) +
        '&time_range=' +
        encodeURIComponent(timeRange) +
        '&access_token=' +
        encodeURIComponent(token);

      const res = await fetch(url);
      if (!res.ok) {
        const errText = await res.text();
        this.logger.warn('Meta Ads query failed for ' + actId + ': HTTP ' + res.status + ' - ' + errText);
        return null;
      }

      const json = (await res.json()) as { data?: any[] };
      const row = json.data?.[0];

      if (!row) {
        return {
          spend: 0,
          reach: 0,
          impressions: 0,
          clicks: 0,
          leads: 0,
          cpl: null,
          cpc: null,
          ctr: null,
          frequency: 0,
        };
      }

      const spend = parseFloat(row.spend || '0') || 0;
      const reach = parseInt(row.reach || '0', 10) || 0;
      const impressions = parseInt(row.impressions || '0', 10) || 0;
      const clicks = parseInt(row.clicks || '0', 10) || 0;
      const cpc = parseFloat(row.cpc || '0') || (clicks > 0 ? spend / clicks : null);
      const ctr = parseFloat(row.ctr || '0') || (impressions > 0 ? (clicks / impressions) * 100 : null);
      const frequency = reach > 0 ? Math.round((impressions / reach) * 100) / 100 : 0;

      // Extract leads from actions array
      let leads = 0;
      if (Array.isArray(row.actions)) {
        for (const action of row.actions) {
          const type = String(action.action_type || '').toLowerCase();
          if (
            type === 'lead' ||
            type === 'onsite_conversion.lead_grouped' ||
            type === 'offsite_complete_registration_add_meta_leads' ||
            type.includes('lead')
          ) {
            const val = parseInt(action.value || '0', 10) || 0;
            if (val > leads) leads = val;
          }
        }
      }

      const cpl = leads > 0 ? Math.round((spend / leads) * 100) / 100 : null;

      return {
        spend,
        reach,
        impressions,
        clicks,
        leads,
        cpl,
        cpc,
        ctr,
        frequency,
      };
    } catch (e) {
      this.logger.warn('Meta Ads getAccountSummary error for ' + actId + ': ' + (e as Error).message);
      return null;
    }
  }
}
