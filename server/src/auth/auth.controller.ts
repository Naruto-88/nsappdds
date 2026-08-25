import { Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';

const SESSION_COOKIE = 'ns_session';

@Controller(['auth', 'home/auth'])
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  private getRedirectUri(req: Request): string {
    const host = req.get('host') || '';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    if (isLocal) {
      return `http://${host}/auth/google/callback`;
    }

    const configured = this.config.get<string>('GOOGLE_REDIRECT_URI') || process.env.GOOGLE_REDIRECT_URI;
    if (configured && configured.trim().startsWith('http')) {
      return configured.trim();
    }
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    return `${proto}://${host}/home/auth/google/callback`;
  }

  @Get('google/login')
  login(@Query('redirectUri') queryUri: string, @Req() req: Request, @Res() res: Response) {
    const host = req.get('host') || 'localhost:3001';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    const redirectUri = queryUri || this.getRedirectUri(req);
    const returnTo = isLocal ? `http://${host}/` : (this.config.get<string>('DASHBOARD_ORIGIN') || `https://${host}/home`);
    res.redirect(this.authService.buildConsentUrl(redirectUri, returnTo));
  }

  @Get('google/callback')
  async callback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
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
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
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
    } catch (e) {
      return this.renderResult(res, false, (e as Error).message);
    }
  }

  @Get('me')
  me(@Req() req: Request) {
    const token = req.cookies?.[SESSION_COOKIE];
    const payload = token ? this.authService.verifySessionToken(token) : null;
    return payload ? { authenticated: true, email: payload.email } : { authenticated: false };
  }

  @Post('logout')
  logout(@Res() res: Response) {
    // Clears the dashboard session only. Deliberately does NOT clear the stored
    // Google connection (TokenStoreService) — that's the one shared GSC/GA4
    // authorization everyone's dashboard session relies on; logging one browser
    // out shouldn't break live data for everyone else.
    res.clearCookie(SESSION_COOKIE);
    res.json({ ok: true });
  }

  private renderResult(res: Response, ok: boolean, detail: string) {
    res
      .status(ok ? 200 : 400)
      .type('html')
      .send(
        `<!doctype html><html><body style="font-family:sans-serif;padding:40px;text-align:center">` +
          `<h2>${ok ? 'Signed in' : 'Sign-in failed'}</h2><p>${detail}</p>` +
          `<p>${ok ? 'Close this tab and return to the dashboard.' : 'Close this tab and try again from the dashboard.'}</p>` +
          `</body></html>`,
      );
  }
}
