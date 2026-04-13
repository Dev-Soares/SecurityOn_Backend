import { Injectable, NotFoundException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { PrismaService } from '../database/prisma.service';
import { Article } from '@prisma/client';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { PaginatedQuery } from 'src/common/types/query-types';

@Injectable()
export class ArticleService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createArticleDto: CreateArticleDto, userId: string): Promise<Article> {
    try {
      return await this.prisma.article.create({
        data: {
          title: createArticleDto.title,
          content: createArticleDto.content,
          bgUrl: createArticleDto.bgUrl,
          userId: userId
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Erro ao criar Artigo');
    }
  }

  async findByUser(dto: PaginationDto, id: string): Promise<PaginatedQuery<Article>> {
    const take = Number(dto.limit) || 10;
    if (take >= 100) throw new InternalServerErrorException('O limite máximo é 100')
    try {
      const searchedArticles = await this.prisma.article.findMany({
        take: take + 1,
        cursor: dto.cursor ? { id: dto.cursor } : undefined,
        skip: dto.cursor ? 1 : 0,
        orderBy: { createdAt: 'desc' },
        where: { userId: id  }
      });

      const hasNextPage = searchedArticles.length > take;
      const articles = hasNextPage ? searchedArticles.slice(0, -1) : searchedArticles;
      const finalItem = articles[articles.length - 1];

      return {
        data: articles,
        nextCursor: hasNextPage ? finalItem.id : null,
        hasNextPage: hasNextPage
      }
    } catch (error) {
      throw new InternalServerErrorException('Erro ao buscar Artigos');
    }

  }

  async findAll(dto: PaginationDto): Promise<PaginatedQuery<Article>> {
    const take = Number(dto.limit) || 10;
    if (take >= 100) throw new InternalServerErrorException('O limite máximo é 100')
    try {
      const searchedArticles = await this.prisma.article.findMany({
        take: take + 1,
        cursor: dto.cursor ? { id: dto.cursor } : undefined,
        skip: dto.cursor ? 1 : 0,
        orderBy: { createdAt: 'desc' },
      });

      const hasNextPage = searchedArticles.length > take;
      const articles = hasNextPage ? searchedArticles.slice(0, -1) : searchedArticles;
      const finalItem = articles[articles.length - 1];

      return {
        data: articles,
        nextCursor: hasNextPage ? finalItem.id : null,
        hasNextPage: hasNextPage
      }
    } catch (error) {
      throw new InternalServerErrorException('Erro ao buscar Artigos');
    }
  }

  async findOne(id: string): Promise<Article> {
    try {
      const article = await this.prisma.article.findUnique({
        where: { id: id },
      });

      if (!article) {
        throw new NotFoundException('Artigo não encontrado');
      }

      return article;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Erro ao buscar Artigo');
    }
  }

  async update(
    id: string,
    updateArticleDto: UpdateArticleDto,
    userId: string,
  ): Promise<Article> {
    try {
      const article = await this.prisma.article.findUnique({
        where: { id },
      });

      if (!article) {
        throw new NotFoundException('Artigo não encontrado');
      }

      if (article.userId !== userId) {
        throw new UnauthorizedException('Você não tem permissão para atualizar este artigo');
      }

      return await this.prisma.article.update({
        where: { id },
        data: {
          title: updateArticleDto.title,
          content: updateArticleDto.content,
          bgUrl: updateArticleDto.bgUrl,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof UnauthorizedException) throw error;
      throw new InternalServerErrorException('Erro ao atualizar Artigo');
    }
  }

  async remove(id: string, userId: string): Promise<Article> {
    try {
      const article = await this.prisma.article.findUnique({
        where: { id },
      });

      if (!article) {
        throw new NotFoundException('Artigo não encontrado');
      }

      if (article.userId !== userId) {
        throw new UnauthorizedException('Você não tem permissão para deletar este artigo');
      }

      return await this.prisma.article.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof UnauthorizedException) throw error;
      throw new InternalServerErrorException('Erro ao deletar Artigo');
    }
  }
  
}
