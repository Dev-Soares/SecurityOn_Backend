import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { HashModule } from '../../utils/hash/hash.module';

@Module({
  providers: [AuthService],
  exports: [AuthService],
  imports: [UserModule, JwtModule, HashModule],
})
export class AuthModule {}
