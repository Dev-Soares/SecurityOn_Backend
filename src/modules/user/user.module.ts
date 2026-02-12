import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { HashModule } from 'src/utils/hash/hash.module';

@Module({
  controllers: [UserController],
  providers: [UserService],
  imports: [DatabaseModule, AuthModule, HashModule],
  exports: [UserService],
})
export class UserModule {}
