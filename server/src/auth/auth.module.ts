import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenStoreService } from './token-store.service';
import { SessionAuthGuard } from './session-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, TokenStoreService, SessionAuthGuard],
  exports: [AuthService, TokenStoreService, SessionAuthGuard],
})
export class AuthModule {}
