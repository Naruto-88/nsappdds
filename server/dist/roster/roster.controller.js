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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RosterController = void 0;
const common_1 = require("@nestjs/common");
const session_auth_guard_1 = require("../auth/session-auth.guard");
const roster_service_1 = require("./roster.service");
const analytics_service_1 = require("../google-api/analytics.service");
let RosterController = class RosterController {
    roster;
    analytics;
    constructor(roster, analytics) {
        this.roster = roster;
        this.analytics = analytics;
    }
    getRoster() {
        return this.roster.getDiscoveredRoster();
    }
    async ga4Lookup(domain) {
        const propertyId = await this.analytics.findPropertyIdForDomain(domain);
        return { domain, propertyId };
    }
};
exports.RosterController = RosterController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], RosterController.prototype, "getRoster", null);
__decorate([
    (0, common_1.Get)('ga4-lookup'),
    __param(0, (0, common_1.Query)('domain')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RosterController.prototype, "ga4Lookup", null);
exports.RosterController = RosterController = __decorate([
    (0, common_1.Controller)(['api/roster', 'home/api/roster']),
    (0, common_1.UseGuards)(session_auth_guard_1.SessionAuthGuard),
    __metadata("design:paramtypes", [roster_service_1.RosterService,
        analytics_service_1.AnalyticsService])
], RosterController);
//# sourceMappingURL=roster.controller.js.map