import { Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';

@Module({
  controllers: [PostController],
  providers: [PostService],
  imports: [ PrismaService ],
})
export class PostModule {}
