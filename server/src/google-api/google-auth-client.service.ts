import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { TokenStoreService } from '../auth/token-store.service';

// Builds an OAuth2 client authorized as the connected Google identity
// (tech@netstripes.com), for server-side calls to GSC/GA4. googleapis'
// OAuth2Client refreshes the access token automatically when it's expired, as
// long as a refresh_token is set — we just need to persist the refreshed token
// back to the store so a restart doesn't lose it.
@Injectable()
export class GoogleAuthClientService {
  private readonly logger = new Logger(GoogleAuthClientService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly tokenStore: TokenStoreService,
  ) {}

  buildOAuth2Client() {
    return new google.auth.OAuth2(
      this.config.get<string>('GOOGLE_CLIENT_ID'),
      this.config.get<string>('GOOGLE_CLIENT_SECRET'),
      this.config.get<string>('GOOGLE_REDIRECT_URI'),
    );
  }

  // Returns an authorized client, or null if no Google account has completed the
  // login-gate flow yet (AuthService.handleCallback populates the token store).
  getAuthorizedClient() {
    const connection = this.tokenStore.get();
    if (!connection) return null;

    const client = this.buildOAuth2Client();
    client.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken,
      expiry_date: connection.expiryDate,
    });
    client.on('tokens', (tokens) => {
      const current = this.tokenStore.get();
      if (!current) return;
      this.tokenStore.save({
        ...current,
        accessToken: tokens.access_token ?? current.accessToken,
        // Google only sends a new refresh_token occasionally; keep the old one otherwise.
        refreshToken: tokens.refresh_token ?? current.refreshToken,
        expiryDate: tokens.expiry_date ?? current.expiryDate,
      });
      this.logger.log('Refreshed and persisted Google access token.');
    });
    return client;
  }
}
