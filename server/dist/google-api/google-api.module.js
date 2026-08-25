"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleApiModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("../auth/auth.module");
const google_auth_client_service_1 = require("./google-auth-client.service");
const search_console_service_1 = require("./search-console.service");
const analytics_service_1 = require("./analytics.service");
const google_ads_service_1 = require("./google-ads.service");
const meta_ads_service_1 = require("./meta-ads.service");
let GoogleApiModule = class GoogleApiModule {
};
exports.GoogleApiModule = GoogleApiModule;
exports.GoogleApiModule = GoogleApiModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule],
        providers: [google_auth_client_service_1.GoogleAuthClientService, search_console_service_1.SearchConsoleService, analytics_service_1.AnalyticsService, google_ads_service_1.GoogleAdsService, meta_ads_service_1.MetaAdsService],
        exports: [search_console_service_1.SearchConsoleService, analytics_service_1.AnalyticsService, google_ads_service_1.GoogleAdsService, meta_ads_service_1.MetaAdsService],
    })
], GoogleApiModule);
//# sourceMappingURL=google-api.module.js.map