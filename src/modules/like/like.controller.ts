import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { LikeService } from './like.service';
import { CreateLikeDto } from './dto/create-like.dto';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import type { AuthenticatedRequest } from 'src/common/types/req-types';

@Controller('like')
export class LikeController {
  constructor(private readonly likeService: LikeService) {}

  @Post()
  @UseGuards(AuthGuard)
  create(
    @Body() createLikeDto: CreateLikeDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.likeService.create(createLikeDto, req.user.sub);
  }

  @Get('all/:postId')
  findByPost(@Query() query: PaginationDto, @Param('postId') postId: string) {
    return this.likeService.findByPost(query, postId);
  }

  @Get('user/:id')
  findByUser(@Query() query: PaginationDto, @Param('id') id: string) {
    return this.likeService.findByUser(query, id);
  }

  @Delete(':postId')
  @UseGuards(AuthGuard)
  remove(
    @Param('postId') postId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.likeService.remove(postId, req.user.sub);
  }
}
