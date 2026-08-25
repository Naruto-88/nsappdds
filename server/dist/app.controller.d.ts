import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    private readonly config;
    constructor(appService: AppService, config: ConfigService);
    getIndex(res: Response): void;
    getConfig(): {
        sheetId: string | null;
    };
}
