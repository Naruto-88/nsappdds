import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { MetricsService } from './metrics.service';
import { PeriodKey } from './period.util';

const VALID_PERIODS: PeriodKey[] = ['week', 'week2', 'week3', 'month', 'q90'];

@Controller(['api/clients', 'home/api/clients'])
@UseGuards(SessionAuthGuard)
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get(':sheetKey/seo')
  async getSeo(@Param('sheetKey') sheetKey: string, @Query('period') period: string) {
    const p: PeriodKey = VALID_PERIODS.includes(period as PeriodKey) ? (period as PeriodKey) : 'week';
    return this.metrics.getSeoMetrics(sheetKey, p);
  }

  @Get(':sheetKey/ads')
  async getAds(@Param('sheetKey') sheetKey: string, @Query('period') period: string) {
    const p: PeriodKey = VALID_PERIODS.includes(period as PeriodKey) ? (period as PeriodKey) : 'week';
    return this.metrics.getAdsMetrics(sheetKey, p);
  }

  @Get(':sheetKey/meta')
  async getMeta(@Param('sheetKey') sheetKey: string, @Query('period') period: string) {
    const p: PeriodKey = VALID_PERIODS.includes(period as PeriodKey) ? (period as PeriodKey) : 'week';
    return this.metrics.getMetaMetrics(sheetKey, p);
  }
}
