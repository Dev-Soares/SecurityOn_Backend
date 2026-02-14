import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { HashModule } from '../../utils/hash/hash.module';

@Module({
  imports: [
    UserModule,
    HashModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,  // ✅ Configure no .env
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
