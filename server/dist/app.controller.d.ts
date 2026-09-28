import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AppService } from './app.service';
import { ClientsConfigService } from './clients-config/clients-config.service';
export declare class AppController {
    private readonly appService;
    private readonly config;
    private readonly clientsConfig;
    constructor(appService: AppService, config: ConfigService, clientsConfig: ClientsConfigService);
    getIndex(res: Response): void;
    getConfig(): {
        sheetId: string | null;
    };
    getSheetTab(tabName: string): Promise<any>;
}
