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
exports.MetricsController = void 0;
const common_1 = require("@nestjs/common");
const session_auth_guard_1 = require("../auth/session-auth.guard");
const metrics_service_1 = require("./metrics.service");
const VALID_PERIODS = ['week', 'week2', 'week3', 'month', 'q90'];
let MetricsController = class MetricsController {
    metrics;
    constructor(metrics) {
        this.metrics = metrics;
    }
    async getSeo(sheetKey, period) {
        const p = VALID_PERIODS.includes(period) ? period : 'week';
        return this.metrics.getSeoMetrics(sheetKey, p);
    }
    async getAds(sheetKey, period) {
        const p = VALID_PERIODS.includes(period) ? period : 'week';
        return this.metrics.getAdsMetrics(sheetKey, p);
    }
    async getMeta(sheetKey, period) {
        const p = VALID_PERIODS.includes(period) ? period : 'week';
        return this.metrics.getMetaMetrics(sheetKey, p);
    }
};
exports.MetricsController = MetricsController;
__decorate([
    (0, common_1.Get)(':sheetKey/seo'),
    __param(0, (0, common_1.Param)('sheetKey')),
    __param(1, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MetricsController.prototype, "getSeo", null);
__decorate([
    (0, common_1.Get)(':sheetKey/ads'),
    __param(0, (0, common_1.Param)('sheetKey')),
    __param(1, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MetricsController.prototype, "getAds", null);
__decorate([
    (0, common_1.Get)(':sheetKey/meta'),
    __param(0, (0, common_1.Param)('sheetKey')),
    __param(1, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MetricsController.prototype, "getMeta", null);
exports.MetricsController = MetricsController = __decorate([
    (0, common_1.Controller)(['api/clients', 'home/api/clients']),
    (0, common_1.UseGuards)(session_auth_guard_1.SessionAuthGuard),
    __metadata("design:paramtypes", [metrics_service_1.MetricsService])
], MetricsController);
//# sourceMappingURL=metrics.controller.js.map