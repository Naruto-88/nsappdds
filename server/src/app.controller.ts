import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { join } from 'path';
import { AppService } from './app.service';
import { SessionAuthGuard } from './auth/session-auth.guard';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly config: ConfigService,
  ) {}

  @Get(['', 'home', 'home_app'])
  getIndex(@Res() res: Response) {
    const indexPath = join(__dirname, '..', '..', 'index.html');
    return res.sendFile(indexPath);
  }

  @Get(['api/config', 'home/api/config'])
  @UseGuards(SessionAuthGuard)
  getConfig() {
    return { sheetId: this.config.get<string>('CONFIG_SHEET_ID') || null };
  }
}
