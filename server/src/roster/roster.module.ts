import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GoogleApiModule } from '../google-api/google-api.module';
import { ClientsConfigModule } from '../clients-config/clients-config.module';
import { RosterController } from './roster.controller';
import { RosterService } from './roster.service';

@Module({
  imports: [AuthModule, GoogleApiModule, ClientsConfigModule],
  controllers: [RosterController],
  providers: [RosterService],
})
export class RosterModule {}
