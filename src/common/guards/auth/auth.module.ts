import { Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { OptionalAuthGuard } from './optionalAuth.guard';

@Module({
  providers: [AuthGuard, OptionalAuthGuard],
  exports: [AuthGuard, OptionalAuthGuard],
})
export class AuthGuardModule {}