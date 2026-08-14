import { Controller, Get, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppService } from './app.service';
import { SessionAuthGuard } from './auth/session-auth.guard';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Lets the dashboard pick up the same Google Sheet the backend already uses for
  // GSC/GA4/Ads client mapping (CONFIG_SHEET_ID in .env), instead of requiring it to
  // be pasted into Governance separately. See autoLoadSheetOnBoot() in index.html.
  @Get('api/config')
  @UseGuards(SessionAuthGuard)
  getConfig() {
    return { sheetId: this.config.get<string>('CONFIG_SHEET_ID') || null };
  }
}
