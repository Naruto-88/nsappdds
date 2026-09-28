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
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const path_1 = require("path");
const app_service_1 = require("./app.service");
const session_auth_guard_1 = require("./auth/session-auth.guard");
const clients_config_service_1 = require("./clients-config/clients-config.service");
let AppController = class AppController {
    appService;
    config;
    clientsConfig;
    constructor(appService, config, clientsConfig) {
        this.appService = appService;
        this.config = config;
        this.clientsConfig = clientsConfig;
    }
    getIndex(res) {
        const indexPath = (0, path_1.join)(__dirname, '..', '..', 'index.html');
        return res.sendFile(indexPath);
    }
    getConfig() {
        return { sheetId: this.config.get('CONFIG_SHEET_ID') || null };
    }
    async getSheetTab(tabName) {
        if (!tabName)
            throw new common_1.BadRequestException('Tab name required');
        return this.clientsConfig.fetchGvizTab(tabName);
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)(['', 'home', 'home_app']),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getIndex", null);
__decorate([
    (0, common_1.Get)(['api/config', 'home/api/config']),
    (0, common_1.UseGuards)(session_auth_guard_1.SessionAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Get)(['api/sheet/tab', 'home/api/sheet/tab']),
    (0, common_1.UseGuards)(session_auth_guard_1.SessionAuthGuard),
    __param(0, (0, common_1.Query)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getSheetTab", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [app_service_1.AppService,
        config_1.ConfigService,
        clients_config_service_1.ClientsConfigService])
], AppController);
