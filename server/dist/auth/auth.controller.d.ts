import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    private readonly config;
    constructor(authService: AuthService, config: ConfigService);
    private getRedirectUri;
    login(queryUri: string, req: Request, res: Response): void;
    callback(code: string, error: string, state: string, req: Request, res: Response): Promise<void>;
    adminLogin(req: Request, res: Response): Response<any, Record<string, any>>;
    googleStatus(): {
        connected: boolean;
        email: string | null;
        expiryDate: number | null;
    };
    me(req: Request): {
        authenticated: boolean;
        email: string;
        googleConnected: boolean;
        googleEmail: string | null;
    } | {
        authenticated: boolean;
        googleConnected: boolean;
        googleEmail: string | null;
        email?: undefined;
    };
    logout(res: Response): void;
    private renderResult;
}
