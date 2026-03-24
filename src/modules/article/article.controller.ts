import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { ArticleService } from './article.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { AuthGuard } from 'src/common/guards/auth/auth.guard';
import { GetArticleDto } from './dto/get-article.dto';
import type { AuthenticatedRequest } from 'src/common/types/req-types';

@Controller('article')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() createArticleDto: CreateArticleDto, @Request() req: AuthenticatedRequest) {
    return this.articleService.create(createArticleDto, req.user.sub);
  }

  @Get()
  findAll(@Query() query: GetArticleDto) {
    return this.articleService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.articleService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(@Param('id') id: string, @Body() updateArticleDto: UpdateArticleDto, @Request() req: AuthenticatedRequest) {
    return this.articleService.update(id, updateArticleDto, req.user.sub);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.articleService.remove(id, req.user.sub);
  }
}
