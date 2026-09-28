import { ConfigService } from '@nestjs/config';
import { TokenStoreService } from '../auth/token-store.service';
export declare class GoogleAuthClientService {
    private readonly config;
    private readonly tokenStore;
    private readonly logger;
    constructor(config: ConfigService, tokenStore: TokenStoreService);
    buildOAuth2Client(): import("googleapis-common").OAuth2Client;
    getAuthorizedClient(): import("googleapis-common").OAuth2Client | null;
}
