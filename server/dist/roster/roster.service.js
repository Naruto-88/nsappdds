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
var RosterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RosterService = void 0;
const common_1 = require("@nestjs/common");
const clients_config_service_1 = require("../clients-config/clients-config.service");
const analytics_service_1 = require("../google-api/analytics.service");
let RosterService = RosterService_1 = class RosterService {
    clientsConfig;
    analytics;
    logger = new common_1.Logger(RosterService_1.name);
    constructor(clientsConfig, analytics) {
        this.clientsConfig = clientsConfig;
        this.analytics = analytics;
    }
    async getDiscoveredRoster() {
        const configRows = await this.clientsConfig.getAllRows();
        const entries = configRows.map((r) => ({
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
        await Promise.all(entries.map(async (entry) => {
            if (entry.ga4PropertyId || !entry.gscSiteUrl)
                return;
            const matched = await this.analytics.findPropertyIdForDomain(entry.gscSiteUrl);
            if (matched) {
                entry.ga4PropertyId = matched;
                entry.ga4AutoMatched = true;
                this.logger.log(`Auto-matched GA4 property ${matched} to ${entry.name} via domain ${entry.gscSiteUrl}`);
            }
        }));
        return entries;
    }
};
exports.RosterService = RosterService;
exports.RosterService = RosterService = RosterService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [clients_config_service_1.ClientsConfigService,
        analytics_service_1.AnalyticsService])
], RosterService);
//# sourceMappingURL=roster.service.js.map