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
var SearchConsoleService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchConsoleService = void 0;
const common_1 = require("@nestjs/common");
const googleapis_1 = require("googleapis");
const google_auth_client_service_1 = require("./google-auth-client.service");
let SearchConsoleService = SearchConsoleService_1 = class SearchConsoleService {
    googleAuth;
    logger = new common_1.Logger(SearchConsoleService_1.name);
    constructor(googleAuth) {
        this.googleAuth = googleAuth;
    }
    async getTotals(siteUrl, startDate, endDate) {
        const auth = this.googleAuth.getAuthorizedClient();
        if (!auth)
            return null;
        try {
            const searchconsole = googleapis_1.google.searchconsole({ version: 'v1', auth });
            const res = await searchconsole.searchanalytics.query({
                siteUrl,
                requestBody: { startDate, endDate, dimensions: [] },
            });
            const row = res.data.rows?.[0];
            if (!row)
                return { clicks: 0, impressions: 0, position: null };
            return {
                clicks: row.clicks ?? 0,
                impressions: row.impressions ?? 0,
                position: row.position ?? null,
            };
        }
        catch (e) {
            this.logger.warn(`GSC query failed for ${siteUrl}: ${e.message}`);
            return null;
        }
    }
    async listSites() {
        const auth = this.googleAuth.getAuthorizedClient();
        if (!auth)
            return [];
        try {
            const searchconsole = googleapis_1.google.searchconsole({ version: 'v1', auth });
            const res = await searchconsole.sites.list();
            return (res.data.siteEntry ?? [])
                .filter((s) => s.permissionLevel !== 'siteUnverifiedUser')
                .map((s) => s.siteUrl ?? '')
                .filter(Boolean);
        }
        catch (e) {
            this.logger.warn(`GSC sites.list failed: ${e.message}`);
            return [];
        }
    }
};
exports.SearchConsoleService = SearchConsoleService;
exports.SearchConsoleService = SearchConsoleService = SearchConsoleService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [google_auth_client_service_1.GoogleAuthClientService])
], SearchConsoleService);
//# sourceMappingURL=search-console.service.js.map