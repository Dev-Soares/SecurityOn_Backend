import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { DatabaseModule } from '../database/database.module';
import { HashModule } from 'src/common/hash/hash.module';

@Module({
  controllers: [UserController],
  providers: [UserService],
  imports: [DatabaseModule, HashModule],
  exports: [UserService],
})
export class UserModule {}
