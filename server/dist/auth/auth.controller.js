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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const auth_service_1 = require("./auth.service");
const SESSION_COOKIE = 'ns_session';
let AuthController = class AuthController {
    authService;
    config;
    constructor(authService, config) {
        this.authService = authService;
        this.config = config;
    }
    getRedirectUri(req) {
        const host = req.get('host') || '';
        const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
        if (isLocal) {
            return `http://${host}/auth/google/callback`;
        }
        const configured = this.config.get('GOOGLE_REDIRECT_URI') || process.env.GOOGLE_REDIRECT_URI;
        if (configured && configured.trim().startsWith('http')) {
            return configured.trim();
        }
        const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        return `${proto}://${host}/home/auth/google/callback`;
    }
    login(queryUri, req, res) {
        const host = req.get('host') || 'localhost:3001';
        const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
        const redirectUri = queryUri || this.getRedirectUri(req);
        const returnTo = isLocal ? `http://${host}/` : (this.config.get('DASHBOARD_ORIGIN') || `https://${host}/home`);
        res.redirect(this.authService.buildConsentUrl(redirectUri, returnTo));
    }
    async callback(code, error, state, req, res) {
        if (error || !code) {
            return this.renderResult(res, false, error || 'No authorization code returned by Google.');
        }
        try {
            const redirectUri = this.getRedirectUri(req);
            const session = await this.authService.handleCallback(code, redirectUri);
            const token = this.authService.issueSessionToken(session);
            res.cookie(SESSION_COOKIE, token, {
                httpOnly: true,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 30 * 24 * 60 * 60 * 1000,
            });
            if (state && (state.startsWith('http://') || state.startsWith('https://'))) {
                return res.redirect(state);
            }
            const host = req.get('host') || 'localhost:3001';
            const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
            if (isLocal) {
                return res.redirect(`http://${host}/`);
            }
            return res.redirect('https://nsapp.netstripes.au/home');
        }
        catch (e) {
            return this.renderResult(res, false, e.message);
        }
    }
    me(req) {
        const token = req.cookies?.[SESSION_COOKIE];
        const payload = token ? this.authService.verifySessionToken(token) : null;
        return payload ? { authenticated: true, email: payload.email } : { authenticated: false };
    }
    logout(res) {
        res.clearCookie(SESSION_COOKIE);
        res.json({ ok: true });
    }
    renderResult(res, ok, detail) {
        res
            .status(ok ? 200 : 400)
            .type('html')
            .send(`<!doctype html><html><body style="font-family:sans-serif;padding:40px;text-align:center">` +
            `<h2>${ok ? 'Signed in' : 'Sign-in failed'}</h2><p>${detail}</p>` +
            `<p>${ok ? 'Close this tab and return to the dashboard.' : 'Close this tab and try again from the dashboard.'}</p>` +
            `</body></html>`);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Get)('google/login'),
    __param(0, (0, common_1.Query)('redirectUri')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Get)('google/callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('error')),
    __param(2, (0, common_1.Query)('state')),
    __param(3, (0, common_1.Req)()),
    __param(4, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "callback", null);
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "me", null);
__decorate([
    (0, common_1.Post)('logout'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "logout", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)(['auth', 'home/auth']),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        config_1.ConfigService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map