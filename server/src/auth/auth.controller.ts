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
    const configured = (this.config.get<string>('GOOGLE_REDIRECT_URI') || process.env.GOOGLE_REDIRECT_URI || '').trim();

    // 1. Determine incoming Host from all possible reverse proxy / Cloudflare headers
    const cfHost = (req.headers['x-forwarded-host'] as string) || (req.headers['x-original-host'] as string) || '';
    const rawHost = req.get('host') || '';
    const host = (cfHost.split(',')[0].trim()) || rawHost;

    // 2. Determine Protocol (https by default for production)
    const proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0].trim() || req.protocol || 'https';

    // 3. Domain-specific auto-detection
    if (host.includes('dashboard.netstripes.au')) {
      return `https://dashboard.netstripes.au/auth/google/callback`;
    }
    if (host.includes('nsapp.netstripes.au')) {
      return `https://nsapp.netstripes.au/home/auth/google/callback`;
    }

    // 4. If configured in .env with a valid non-local domain, use that
    if (configured && configured.startsWith('http') && !configured.includes('localhost') && !configured.includes('127.0.0.1')) {
      return configured;
    }

    // 5. Truly local development on developer PC
    const isLocal = !cfHost && (host.includes('localhost') || host.startsWith('127.0.0.1'));
    if (isLocal) {
      return `http://${host}/auth/google/callback`;
    }

    // 6. Generic production fallback: if SUBPATH is set use subpath, else root
    const subpath = (process.env.SUBPATH || '').replace(/^\/+|\/+$/g, '');
    const pathPrefix = subpath ? `/${subpath}` : '';
    return `${proto}://${host}${pathPrefix}/auth/google/callback`;
  }

  @Get('google/login')
  login(@Query('redirectUri') queryUri: string, @Req() req: Request, @Res() res: Response) {
    const cfHost = (req.headers['x-forwarded-host'] as string) || (req.headers['x-original-host'] as string) || '';
    const rawHost = req.get('host') || '';
    const host = (cfHost.split(',')[0].trim()) || rawHost || 'localhost:3001';
    const proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0].trim() || req.protocol || 'https';

    const isLocal = !cfHost && (host.includes('localhost') || host.startsWith('127.0.0.1'));
    const redirectUri = queryUri || this.getRedirectUri(req);

    let returnTo: string;
    if (isLocal) {
      returnTo = `http://${host}/`;
    } else if (host.includes('dashboard.netstripes.au')) {
      returnTo = `https://dashboard.netstripes.au/`;
    } else if (host.includes('nsapp.netstripes.au')) {
      returnTo = `https://nsapp.netstripes.au/home`;
    } else {
      const configuredOrigin = this.config.get<string>('DASHBOARD_ORIGIN') || process.env.DASHBOARD_ORIGIN;
      returnTo = configuredOrigin || `${proto}://${host}/`;
    }

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

  @Post('admin/login')
  adminLogin(@Req() req: Request, @Res() res: Response) {
    const { username, password } = req.body || {};
    const validUser = this.config.get<string>('ADMIN_USERNAME') || 'Admin';
    const validPass = this.config.get<string>('ADMIN_PASSWORD') || 'Melaka@123#';

    if (username === validUser && password === validPass) {
      const token = this.authService.issueSessionToken({ email: `${validUser}@netstripes.com` });
      const host = req.get('host') || '';
      const isLocal = host.includes('localhost') || host.includes('127.0.0.1');

      res.cookie(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: !isLocal && process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      return res.json({ ok: true, email: `${validUser}@netstripes.com` });
    }

    return res.status(401).json({ ok: false, error: 'Invalid username or password' });
  }

  @Get('google/status')
  googleStatus() {
    return this.authService.getGoogleConnection();
  }

  @Get('me')
  me(@Req() req: Request) {
    const token = req.cookies?.[SESSION_COOKIE];
    const payload = token ? this.authService.verifySessionToken(token) : null;
    const googleConn = this.authService.getGoogleConnection();
    return payload
      ? { authenticated: true, email: payload.email, googleConnected: googleConn.connected, googleEmail: googleConn.email }
      : { authenticated: false, googleConnected: googleConn.connected, googleEmail: googleConn.email };
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
