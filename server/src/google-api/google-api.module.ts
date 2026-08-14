import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GoogleAuthClientService } from './google-auth-client.service';
import { SearchConsoleService } from './search-console.service';
import { AnalyticsService } from './analytics.service';
import { GoogleAdsService } from './google-ads.service';

@Module({
  imports: [AuthModule], // for TokenStoreService
  providers: [GoogleAuthClientService, SearchConsoleService, AnalyticsService, GoogleAdsService],
  exports: [SearchConsoleService, AnalyticsService, GoogleAdsService],
})
export class GoogleApiModule {}
