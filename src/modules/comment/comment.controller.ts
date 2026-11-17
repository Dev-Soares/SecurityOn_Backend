import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import type { AuthenticatedRequest } from 'src/common/types/req-types';

@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  @UseGuards(AuthGuard)
  create(
    @Body() createCommentDto: CreateCommentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.commentService.create(createCommentDto, req.user.sub);
  }

  @Get('all/:postId')
  findByPost(@Query() query: PaginationDto, @Param('postId') postId: string) {
    return this.commentService.findByPost(query, postId);
  }

  @Get('user/:id')
  findByUser(@Query() query: PaginationDto, @Param('id') id: string) {
    return this.commentService.findByUser(query, id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.commentService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.commentService.update(id, updateCommentDto, req.user.sub);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.commentService.remove(id, req.user.sub);
  }
}
