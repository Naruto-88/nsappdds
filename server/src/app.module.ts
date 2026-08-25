import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { GoogleApiModule } from './google-api/google-api.module';
import { ClientsConfigModule } from './clients-config/clients-config.module';
import { MetricsModule } from './metrics/metrics.module';
import { RosterModule } from './roster/roster.module';

import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(process.cwd(), '.env'),
        join(process.cwd(), 'server', '.env'),
        join(__dirname, '..', '.env'),
        join(__dirname, '..', '..', '.env'),
        '.env',
      ],
    }),
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
