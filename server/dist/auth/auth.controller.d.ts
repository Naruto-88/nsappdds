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
    me(req: Request): {
        authenticated: boolean;
        email: string;
    } | {
        authenticated: boolean;
        email?: undefined;
    };
    logout(res: Response): void;
    private renderResult;
}
