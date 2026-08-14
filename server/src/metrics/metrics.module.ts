import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GoogleApiModule } from '../google-api/google-api.module';
import { ClientsConfigModule } from '../clients-config/clients-config.module';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Module({
  imports: [AuthModule, GoogleApiModule, ClientsConfigModule],
  controllers: [MetricsController],
  providers: [MetricsService],
})
export class MetricsModule {}
