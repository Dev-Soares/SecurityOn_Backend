import { Module } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { DatabaseModule } from '../database/database.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuardModule } from 'src/common/guards/auth/auth.module';

@Module({
  controllers: [CommentController],
  providers: [CommentService],
  imports: [DatabaseModule, JwtModule, AuthGuardModule],
})
export class CommentModule {}
