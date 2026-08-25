import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import * as jwt from 'jsonwebtoken';
import { TokenStoreService } from './token-store.service';

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/adwords', // Google Ads API — read + report access
];

export interface SessionPayload {
  email: string;
}

// This login IS the "connect GSC/GA4" step: the same OAuth consent that lets someone
// into the dashboard also grants the webmasters/analytics scopes the backend later
// uses server-side for every client's GSC/GA4 calls (see GoogleAuthClientService).
// Only whoever completes this login as tech@netstripes.com will actually see real
// GSC/GA4 numbers — anyone else on the Workspace domain can sign in (if ALLOWED_HD
// is set) but Google will simply return no access for properties they don't have.
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly tokenStore: TokenStoreService,
  ) {}

  private buildOAuth2Client(redirectUri?: string) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID') || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET') || process.env.GOOGLE_CLIENT_SECRET;
    const defaultUri = this.config.get<string>('GOOGLE_REDIRECT_URI') || process.env.GOOGLE_REDIRECT_URI || 'https://nsapp.netstripes.au/home/auth/google/callback';
    
    return new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri || defaultUri,
    );
  }

  buildConsentUrl(redirectUri?: string, state?: string): string {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID') || process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET') || process.env.GOOGLE_CLIENT_SECRET || '';
    const uri = redirectUri || this.config.get<string>('GOOGLE_REDIRECT_URI') || process.env.GOOGLE_REDIRECT_URI || 'https://nsapp.netstripes.au/home/auth/google/callback';

    const client = new google.auth.OAuth2(clientId, clientSecret, uri);
    const hd = this.config.get<string>('ALLOWED_HD') || process.env.ALLOWED_HD;
    
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

  async handleCallback(code: string, redirectUri?: string): Promise<SessionPayload> {
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
          audience: this.config.get<string>('GOOGLE_CLIENT_ID'),
        });
        const payload = ticket.getPayload();
        if (payload?.email) email = payload.email;
      } catch (e) {}
    }

    const allowedHd = this.config.get<string>('ALLOWED_HD');
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

  issueSessionToken(payload: SessionPayload): string {
    const secret = this.config.get<string>('SESSION_JWT_SECRET')!;
    return jwt.sign(payload, secret, { expiresIn: '30d' });
  }

  verifySessionToken(token: string): SessionPayload | null {
    try {
      const secret = this.config.get<string>('SESSION_JWT_SECRET')!;
      return jwt.verify(token, secret) as SessionPayload;
    } catch {
      return null;
    }
  }
}
