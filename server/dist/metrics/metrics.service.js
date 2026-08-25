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
var MetricsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsService = void 0;
const common_1 = require("@nestjs/common");
const clients_config_service_1 = require("../clients-config/clients-config.service");
const search_console_service_1 = require("../google-api/search-console.service");
const analytics_service_1 = require("../google-api/analytics.service");
const google_ads_service_1 = require("../google-api/google-ads.service");
const meta_ads_service_1 = require("../google-api/meta-ads.service");
const period_util_1 = require("./period.util");
let MetricsService = MetricsService_1 = class MetricsService {
    clientsConfig;
    searchConsole;
    analytics;
    googleAds;
    metaAds;
    logger = new common_1.Logger(MetricsService_1.name);
    constructor(clientsConfig, searchConsole, analytics, googleAds, metaAds) {
        this.clientsConfig = clientsConfig;
        this.searchConsole = searchConsole;
        this.analytics = analytics;
        this.googleAds = googleAds;
        this.metaAds = metaAds;
    }
    async getSeoMetrics(sheetKey, period) {
        const mapping = await this.clientsConfig.getMapping(sheetKey);
        const current = (0, period_util_1.periodDateRange)(period);
        const prior = (0, period_util_1.priorPeriodDateRange)(period);
        if (!mapping) {
            this.logger.warn(`No _CONFIG row found for sheetKey "${sheetKey}" — check it matches the client's Client ID column exactly.`);
        }
        else if (!mapping.gscSiteUrl && !mapping.ga4PropertyId) {
            this.logger.warn(`"${sheetKey}" has a _CONFIG row but no GSC Site URL / GA4 Property ID filled in yet.`);
        }
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
        this.logger.log(`SEO metrics for "${sheetKey}" [${period}, ${current.start}..${current.end}]: ` +
            `gsc=${mapping?.gscSiteUrl ? (gsc ? 'ok' : 'FAILED') : 'not mapped'}, ` +
            `ga4=${ga4PropertyId ? (ga4Organic ? `ok${mapping?.ga4PropertyId ? '' : ' (auto-matched)'}` : 'FAILED') : 'not mapped'}` +
            (ga4Organic ? ` -> traffic=${ga4Organic.traffic}, leads=${ga4Organic.leads}` : '') +
            (gsc ? `, position=${gsc.position}, impressions=${gsc.impressions}` : ''));
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
    async getAdsMetrics(sheetKey, period) {
        const mapping = await this.clientsConfig.getMapping(sheetKey);
        const current = (0, period_util_1.periodDateRange)(period);
        if (mapping && !mapping.googleAdsCustomerId) {
            this.logger.warn(`"${sheetKey}" has a _CONFIG row but no Google Ads Customer ID filled in yet.`);
        }
        const ads = mapping?.googleAdsCustomerId
            ? await this.googleAds.getAccountSummary(mapping.googleAdsCustomerId, current)
            : null;
        this.logger.log(`Ads metrics for "${sheetKey}" [${period}]: ${mapping?.googleAdsCustomerId ? (ads ? 'ok' : 'FAILED') : 'not mapped'}` +
            (ads ? ` -> spend=${ads.spend}, clicks=${ads.clicks}, conversions=${ads.conversions}` : ''));
        return {
            spend: ads ? ads.spend : null,
            clicks: ads ? ads.clicks : null,
            conversions: ads ? ads.conversions : null,
            roas: ads ? ads.roas : null,
            ctr: ads ? ads.ctr : null,
            qualityScore: ads ? ads.qualityScore : null,
        };
    }
    async getMetaMetrics(sheetKey, period) {
        const mapping = await this.clientsConfig.getMapping(sheetKey);
        const current = (0, period_util_1.periodDateRange)(period);
        if (mapping && !mapping.metaAdAccountId) {
            this.logger.warn(`"${sheetKey}" has a _CONFIG row but no Meta Ad Account ID filled in yet.`);
        }
        const meta = mapping?.metaAdAccountId
            ? await this.metaAds.getAccountSummary(mapping.metaAdAccountId, current)
            : null;
        this.logger.log(`Meta metrics for "${sheetKey}" [${period}]: ${mapping?.metaAdAccountId ? (meta ? 'ok' : 'FAILED') : 'not mapped'}` +
            (meta ? ` -> spend=${meta.spend}, reach=${meta.reach}, leads=${meta.leads}, cpl=${meta.cpl}` : ''));
        return {
            spend: meta ? meta.spend : null,
            reach: meta ? meta.reach : null,
            impressions: meta ? meta.impressions : null,
            clicks: meta ? meta.clicks : null,
            leads: meta ? meta.leads : null,
            cpl: meta ? meta.cpl : null,
            cpc: meta ? meta.cpc : null,
            ctr: meta ? meta.ctr : null,
            frequency: meta ? meta.frequency : null,
        };
    }
};
exports.MetricsService = MetricsService;
exports.MetricsService = MetricsService = MetricsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [clients_config_service_1.ClientsConfigService,
        search_console_service_1.SearchConsoleService,
        analytics_service_1.AnalyticsService,
        google_ads_service_1.GoogleAdsService,
        meta_ads_service_1.MetaAdsService])
], MetricsService);
//# sourceMappingURL=metrics.service.js.map