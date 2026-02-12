import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  providers: [AuthService],
  exports: [AuthService],
  imports: [UserModule, JwtModule],
})
export class AuthModule {}
