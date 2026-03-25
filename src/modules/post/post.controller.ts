import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import type { AuthenticatedRequest } from 'src/common/types/req-types';

@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() createPostDto: CreatePostDto, @Request() req: AuthenticatedRequest) {
    return this.postService.create(createPostDto, req.user.sub);
  }

  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.postService.findAll(query);
  }

  @Get('all/:id')
  findByUser(@Query() query: PaginationDto ,@Param('id') id: string) {
    return this.postService.findByUser(query,id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto, @Request() req: AuthenticatedRequest) {
    return this.postService.update(id, updatePostDto, req.user.sub);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.postService.remove(id, req.user.sub);
  }
}
