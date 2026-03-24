import { Module } from '@nestjs/common';
import { ArticleService } from './article.service';
import { ArticleController } from './article.controller';
import { DatabaseModule } from '../database/database.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuardModule } from 'src/common/guards/auth/auth.module';

@Module({
  controllers: [ArticleController],
  providers: [ArticleService],
  imports: [DatabaseModule, JwtModule, AuthGuardModule],
})
export class ArticleModule {}
