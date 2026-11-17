import { Module } from '@nestjs/common';
import { LikeService } from './like.service';
import { LikeController } from './like.controller';
import { DatabaseModule } from '../database/database.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuardModule } from 'src/common/guards/auth/auth.module';

@Module({
  controllers: [LikeController],
  providers: [LikeService],
  imports: [DatabaseModule, JwtModule, AuthGuardModule],
})
export class LikeModule {}
