"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MetaAdsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaAdsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const GRAPH_API_VERSION = 'v20.0';
const BASE_URL = 'https://graph.facebook.com/' + GRAPH_API_VERSION;
let MetaAdsService = MetaAdsService_1 = class MetaAdsService {
    config;
    logger = new common_1.Logger(MetaAdsService_1.name);
    constructor(config) {
        this.config = config;
    }
    getAccessToken() {
        const token = this.config.get('META_ACCESS_TOKEN');
        if (!token) {
            this.logger.warn('META_ACCESS_TOKEN not set — Meta Ads calls skipped.');
            return null;
        }
        return token.replace(/^[']|[']$/g, '').trim();
    }
    async getAccountSummary(accountId, current) {
        const token = this.getAccessToken();
        if (!token)
            return null;
        let actId = accountId.trim();
        if (!actId.startsWith('act_')) {
            actId = 'act_' + actId;
        }
        try {
            const timeRange = JSON.stringify({ since: current.start, until: current.end });
            const fields = 'spend,impressions,reach,clicks,cpc,ctr,actions';
            const url = BASE_URL +
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
            const json = (await res.json());
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
            let leads = 0;
            if (Array.isArray(row.actions)) {
                for (const action of row.actions) {
                    const type = String(action.action_type || '').toLowerCase();
                    if (type === 'lead' ||
                        type === 'onsite_conversion.lead_grouped' ||
                        type === 'offsite_complete_registration_add_meta_leads' ||
                        type.includes('lead')) {
                        const val = parseInt(action.value || '0', 10) || 0;
                        if (val > leads)
                            leads = val;
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
        }
        catch (e) {
            this.logger.warn('Meta Ads getAccountSummary error for ' + actId + ': ' + e.message);
            return null;
        }
    }
};
exports.MetaAdsService = MetaAdsService;
exports.MetaAdsService = MetaAdsService = MetaAdsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MetaAdsService);
//# sourceMappingURL=meta-ads.service.js.map