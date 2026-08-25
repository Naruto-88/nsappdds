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
var GoogleAdsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleAdsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const google_auth_client_service_1 = require("./google-auth-client.service");
const API_VERSION = 'v19';
const BASE_URL = `https://googleads.googleapis.com/${API_VERSION}`;
let GoogleAdsService = GoogleAdsService_1 = class GoogleAdsService {
    config;
    googleAuth;
    logger = new common_1.Logger(GoogleAdsService_1.name);
    constructor(config, googleAuth) {
        this.config = config;
        this.googleAuth = googleAuth;
    }
    async authHeaders() {
        const client = this.googleAuth.getAuthorizedClient();
        if (!client)
            return null;
        const developerToken = this.config.get('GOOGLE_ADS_DEVELOPER_TOKEN');
        if (!developerToken) {
            this.logger.warn('GOOGLE_ADS_DEVELOPER_TOKEN not set — Google Ads calls skipped until it is.');
            return null;
        }
        const { token } = await client.getAccessToken();
        if (!token)
            return null;
        const headers = {
            Authorization: `Bearer ${token}`,
            'developer-token': developerToken,
            'Content-Type': 'application/json',
        };
        const loginCustomerId = this.config.get('GOOGLE_ADS_LOGIN_CUSTOMER_ID');
        if (loginCustomerId)
            headers['login-customer-id'] = loginCustomerId.replace(/-/g, '');
        return headers;
    }
    async search(customerId, headers, query) {
        const res = await fetch(`${BASE_URL}/customers/${customerId}/googleAds:search`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ query }),
        });
        if (!res.ok)
            throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        const data = (await res.json());
        return data.results ?? [];
    }
    async listAccessibleCustomers() {
        const headers = await this.authHeaders();
        if (!headers)
            return [];
        try {
            const res = await fetch(`${BASE_URL}/customers:listAccessibleCustomers`, { headers });
            if (!res.ok)
                throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            const data = (await res.json());
            return (data.resourceNames ?? []).map((rn) => rn.replace('customers/', ''));
        }
        catch (e) {
            this.logger.warn(`listAccessibleCustomers failed: ${e.message}`);
            return [];
        }
    }
    async getAccountSummary(customerId, current) {
        const headers = await this.authHeaders();
        if (!headers)
            return null;
        const cid = customerId.replace(/-/g, '');
        try {
            const rows = await this.search(cid, headers, `SELECT metrics.cost_micros, metrics.clicks, metrics.conversions, metrics.conversions_value, metrics.ctr
         FROM customer
         WHERE segments.date BETWEEN '${current.start}' AND '${current.end}'`);
            const row = rows[0];
            const spend = row ? Number(row.metrics?.costMicros ?? 0) / 1_000_000 : 0;
            const clicks = row ? Number(row.metrics?.clicks ?? 0) : 0;
            const conversions = row ? Number(row.metrics?.conversions ?? 0) : 0;
            const conversionsValue = row ? Number(row.metrics?.conversionsValue ?? 0) : 0;
            const ctr = row ? Number(row.metrics?.ctr ?? 0) * 100 : 0;
            const roas = spend > 0 ? conversionsValue / spend : null;
            const qualityScore = await this.getAverageQualityScore(cid, headers, current);
            return { spend, clicks, conversions, roas, ctr, qualityScore };
        }
        catch (e) {
            this.logger.warn(`Google Ads getAccountSummary failed for ${cid}: ${e.message}`);
            return null;
        }
    }
    async getAverageQualityScore(cid, headers, current) {
        try {
            const rows = await this.search(cid, headers, `SELECT ad_group_criterion.quality_info.quality_score
         FROM keyword_view
         WHERE segments.date BETWEEN '${current.start}' AND '${current.end}'
           AND ad_group_criterion.status = 'ENABLED'
           AND ad_group_criterion.quality_info.quality_score > 0`);
            const scores = rows
                .map((r) => Number(r.adGroupCriterion?.qualityInfo?.qualityScore ?? 0))
                .filter((s) => s > 0);
            if (!scores.length)
                return null;
            return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
        }
        catch (e) {
            this.logger.warn(`Quality score query failed for ${cid}: ${e.message}`);
            return null;
        }
    }
};
exports.GoogleAdsService = GoogleAdsService;
exports.GoogleAdsService = GoogleAdsService = GoogleAdsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        google_auth_client_service_1.GoogleAuthClientService])
], GoogleAdsService);
//# sourceMappingURL=google-ads.service.js.map