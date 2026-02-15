import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { DatabaseModule } from '../database/database.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuardModule } from 'src/common/guards/auth/auth.module';

@Module({
  controllers: [PostController],
  providers: [PostService],
  imports: [DatabaseModule, JwtModule, AuthGuardModule],
})
export class PostModule {}
