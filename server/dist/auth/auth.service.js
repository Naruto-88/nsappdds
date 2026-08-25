"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const googleapis_1 = require("googleapis");
const jwt = __importStar(require("jsonwebtoken"));
const token_store_service_1 = require("./token-store.service");
const SCOPES = [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/webmasters.readonly',
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/adwords',
];
let AuthService = AuthService_1 = class AuthService {
    config;
    tokenStore;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(config, tokenStore) {
        this.config = config;
        this.tokenStore = tokenStore;
    }
    buildOAuth2Client(redirectUri) {
        const clientId = this.config.get('GOOGLE_CLIENT_ID') || process.env.GOOGLE_CLIENT_ID;
        const clientSecret = this.config.get('GOOGLE_CLIENT_SECRET') || process.env.GOOGLE_CLIENT_SECRET;
        const defaultUri = this.config.get('GOOGLE_REDIRECT_URI') || process.env.GOOGLE_REDIRECT_URI || 'https://nsapp.netstripes.au/home/auth/google/callback';
        return new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri || defaultUri);
    }
    buildConsentUrl(redirectUri, state) {
        const clientId = this.config.get('GOOGLE_CLIENT_ID') || process.env.GOOGLE_CLIENT_ID || '';
        const clientSecret = this.config.get('GOOGLE_CLIENT_SECRET') || process.env.GOOGLE_CLIENT_SECRET || '';
        const uri = redirectUri || this.config.get('GOOGLE_REDIRECT_URI') || process.env.GOOGLE_REDIRECT_URI || 'https://nsapp.netstripes.au/home/auth/google/callback';
        const client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, uri);
        const hd = this.config.get('ALLOWED_HD') || process.env.ALLOWED_HD;
        return client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: SCOPES,
            redirect_uri: uri,
            client_id: clientId,
            ...(state ? { state } : {}),
            ...(hd ? { hd } : {}),
        });
    }
    async handleCallback(code, redirectUri) {
        const client = this.buildOAuth2Client(redirectUri);
        const { tokens } = await client.getToken(code);
        if (!tokens.access_token) {
            throw new Error('No access_token returned by Google.');
        }
        client.setCredentials(tokens);
        let email = 'tech@netstripes.com';
        if (tokens.id_token) {
            try {
                const ticket = await client.verifyIdToken({
                    idToken: tokens.id_token,
                    audience: this.config.get('GOOGLE_CLIENT_ID'),
                });
                const payload = ticket.getPayload();
                if (payload?.email)
                    email = payload.email;
            }
            catch (e) { }
        }
        const allowedHd = this.config.get('ALLOWED_HD');
        if (allowedHd && !email.endsWith('@' + allowedHd)) {
            throw new Error(`This dashboard is restricted to ${allowedHd} Google accounts.`);
        }
        const existing = this.tokenStore.get();
        this.tokenStore.save({
            email,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || existing?.refreshToken || '',
            expiryDate: tokens.expiry_date ?? Date.now() + 3600_000,
            scopes: SCOPES,
        });
        this.logger.log(`Google connection established for ${email}.`);
        return { email };
    }
    issueSessionToken(payload) {
        const secret = this.config.get('SESSION_JWT_SECRET');
        return jwt.sign(payload, secret, { expiresIn: '30d' });
    }
    verifySessionToken(token) {
        try {
            const secret = this.config.get('SESSION_JWT_SECRET');
            return jwt.verify(token, secret);
        }
        catch {
            return null;
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        token_store_service_1.TokenStoreService])
], AuthService);
//# sourceMappingURL=auth.service.js.map