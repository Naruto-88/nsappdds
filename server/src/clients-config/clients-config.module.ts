import { Module } from '@nestjs/common';
import { ClientsConfigService } from './clients-config.service';

@Module({
  providers: [ClientsConfigService],
  exports: [ClientsConfigService],
})
export class ClientsConfigModule {}
