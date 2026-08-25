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
var AnalyticsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const googleapis_1 = require("googleapis");
const google_auth_client_service_1 = require("./google-auth-client.service");
let AnalyticsService = AnalyticsService_1 = class AnalyticsService {
    googleAuth;
    logger = new common_1.Logger(AnalyticsService_1.name);
    domainMapCache = null;
    domainMapTtlMs = 30 * 60 * 1000;
    constructor(googleAuth) {
        this.googleAuth = googleAuth;
    }
    async getOrganicSummary(propertyId, current, prior) {
        const auth = this.googleAuth.getAuthorizedClient();
        if (!auth)
            return null;
        try {
            const analyticsdata = googleapis_1.google.analyticsdata({ version: 'v1beta', auth });
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
            const organicRow = (rows) => rows?.find((r) => r.dimensionValues?.[0]?.value === 'Organic Search');
            const currentRow = organicRow(currentRes.data.rows ?? undefined);
            const priorRow = organicRow(priorRes.data.rows ?? undefined);
            const traffic = Number(currentRow?.metricValues?.[0]?.value ?? 0);
            const leads = Number(currentRow?.metricValues?.[1]?.value ?? 0);
            const priorTraffic = Number(priorRow?.metricValues?.[0]?.value ?? 0);
            const growth = priorTraffic > 0 ? ((traffic - priorTraffic) / priorTraffic) * 100 : null;
            return { traffic, growth, leads };
        }
        catch (e) {
            this.logger.warn(`GA4 runReport failed for property ${propertyId}: ${e.message}`);
            return null;
        }
    }
    async getSiteSummary(propertyId, current) {
        const auth = this.googleAuth.getAuthorizedClient();
        if (!auth)
            return null;
        try {
            const analyticsdata = googleapis_1.google.analyticsdata({ version: 'v1beta', auth });
            const res = await analyticsdata.properties.runReport({
                property: `properties/${propertyId}`,
                requestBody: {
                    dateRanges: [{ startDate: current.start, endDate: current.end }],
                    metrics: [{ name: 'sessions' }, { name: 'engagementRate' }, { name: 'bounceRate' }],
                },
            });
            const row = res.data.rows?.[0];
            if (!row)
                return { sessions: 0, engagementRate: 0, bounceRate: 0 };
            return {
                sessions: Number(row.metricValues?.[0]?.value ?? 0),
                engagementRate: Number(row.metricValues?.[1]?.value ?? 0) * 100,
                bounceRate: Number(row.metricValues?.[2]?.value ?? 0) * 100,
            };
        }
        catch (e) {
            this.logger.warn(`GA4 site-summary runReport failed for property ${propertyId}: ${e.message}`);
            return null;
        }
    }
    async findPropertyIdForDomain(domain) {
        const auth = this.googleAuth.getAuthorizedClient();
        if (!auth)
            return null;
        try {
            const map = await this.getDomainToPropertyMap(auth);
            return map.get(this.normalizeDomain(domain)) ?? null;
        }
        catch (e) {
            this.logger.warn(`GA4 domain auto-match failed for ${domain}: ${e.message}`);
            return null;
        }
    }
    async getDomainToPropertyMap(auth) {
        if (this.domainMapCache && Date.now() - this.domainMapCache.at < this.domainMapTtlMs) {
            return this.domainMapCache.map;
        }
        const analyticsadmin = googleapis_1.google.analyticsadmin({ version: 'v1beta', auth: auth });
        const map = new Map();
        const summaries = await analyticsadmin.accountSummaries.list({ pageSize: 200 });
        const propertyIds = (summaries.data.accountSummaries ?? [])
            .flatMap((a) => a.propertySummaries ?? [])
            .map((p) => p.property?.replace('properties/', ''))
            .filter((id) => !!id);
        await Promise.all(propertyIds.map(async (propertyId) => {
            try {
                const streams = await analyticsadmin.properties.dataStreams.list({ parent: `properties/${propertyId}` });
                for (const s of streams.data.dataStreams ?? []) {
                    const uri = s.webStreamData?.defaultUri;
                    if (uri)
                        map.set(this.normalizeDomain(uri), propertyId);
                }
            }
            catch {
            }
        }));
        this.logger.log(`GA4 domain auto-match map built: ${map.size} web streams across ${propertyIds.length} accessible properties.`);
        this.domainMapCache = { at: Date.now(), map };
        return map;
    }
    normalizeDomain(input) {
        return String(input || '')
            .replace(/^sc-domain:/, '')
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/\/$/, '')
            .toLowerCase();
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = AnalyticsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [google_auth_client_service_1.GoogleAuthClientService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map