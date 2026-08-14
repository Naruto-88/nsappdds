import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { GoogleApiModule } from './google-api/google-api.module';
import { ClientsConfigModule } from './clients-config/clients-config.module';
import { MetricsModule } from './metrics/metrics.module';
import { RosterModule } from './roster/roster.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    GoogleApiModule,
    ClientsConfigModule,
    MetricsModule,
    RosterModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
