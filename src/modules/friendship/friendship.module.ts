import { Module } from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { FriendshipController } from './friendship.controller';
import { DatabaseModule } from '../database/database.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuardModule } from 'src/common/guards/auth/auth.module';

@Module({
  controllers: [FriendshipController],
  providers: [FriendshipService],
  imports: [DatabaseModule, JwtModule, AuthGuardModule],
})
export class FriendshipModule {}
