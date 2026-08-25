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
var GoogleAuthClientService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleAuthClientService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const googleapis_1 = require("googleapis");
const token_store_service_1 = require("../auth/token-store.service");
let GoogleAuthClientService = GoogleAuthClientService_1 = class GoogleAuthClientService {
    config;
    tokenStore;
    logger = new common_1.Logger(GoogleAuthClientService_1.name);
    constructor(config, tokenStore) {
        this.config = config;
        this.tokenStore = tokenStore;
    }
    buildOAuth2Client() {
        return new googleapis_1.google.auth.OAuth2(this.config.get('GOOGLE_CLIENT_ID'), this.config.get('GOOGLE_CLIENT_SECRET'), this.config.get('GOOGLE_REDIRECT_URI'));
    }
    getAuthorizedClient() {
        const connection = this.tokenStore.get();
        if (!connection)
            return null;
        const client = this.buildOAuth2Client();
        client.setCredentials({
            access_token: connection.accessToken,
            refresh_token: connection.refreshToken,
            expiry_date: connection.expiryDate,
        });
        client.on('tokens', (tokens) => {
            const current = this.tokenStore.get();
            if (!current)
                return;
            this.tokenStore.save({
                ...current,
                accessToken: tokens.access_token ?? current.accessToken,
                refreshToken: tokens.refresh_token ?? current.refreshToken,
                expiryDate: tokens.expiry_date ?? current.expiryDate,
            });
            this.logger.log('Refreshed and persisted Google access token.');
        });
        return client;
    }
};
exports.GoogleAuthClientService = GoogleAuthClientService;
exports.GoogleAuthClientService = GoogleAuthClientService = GoogleAuthClientService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        token_store_service_1.TokenStoreService])
], GoogleAuthClientService);
//# sourceMappingURL=google-auth-client.service.js.map