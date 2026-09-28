import { ConfigService } from '@nestjs/config';
import { TokenStoreService } from './token-store.service';
export interface SessionPayload {
    email: string;
}
export declare class AuthService {
    private readonly config;
    private readonly tokenStore;
    private readonly logger;
    constructor(config: ConfigService, tokenStore: TokenStoreService);
    private buildOAuth2Client;
    buildConsentUrl(redirectUri?: string, state?: string): string;
    handleCallback(code: string, redirectUri?: string): Promise<SessionPayload>;
    issueSessionToken(payload: SessionPayload): string;
    verifySessionToken(token: string): SessionPayload | null;
}
