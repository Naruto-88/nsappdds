import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';

// Protects every /api/* route (see MetricsController) — requires the signed
// session cookie issued by AuthService after a successful Google login.
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.cookies?.['ns_session'];
    if (!token) throw new UnauthorizedException('Not signed in.');
    const payload = this.authService.verifySessionToken(token);
    if (!payload) throw new UnauthorizedException('Session expired — please sign in again.');
    (req as Request & { user: { email: string } }).user = payload;
    return true;
  }
}
