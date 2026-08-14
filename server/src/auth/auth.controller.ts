import { Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';

const SESSION_COOKIE = 'ns_session';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Get('google/login')
  login(@Res() res: Response) {
    res.redirect(this.authService.buildConsentUrl());
  }

  @Get('google/callback')
  async callback(@Query('code') code: string, @Query('error') error: string, @Res() res: Response) {
    if (error || !code) {
      return this.renderResult(res, false, error || 'No authorization code returned by Google.');
    }
    try {
      const session = await this.authService.handleCallback(code);
      const token = this.authService.issueSessionToken(session);
      res.cookie(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });
      const dashboardOrigin = this.config.get<string>('DASHBOARD_ORIGIN');
      if (dashboardOrigin) return res.redirect(dashboardOrigin);
      return this.renderResult(res, true, session.email);
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
