import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Comment, Prisma } from '@prisma/client';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { PaginatedQuery } from 'src/common/types/query-types';
import { CommentWithUser } from './types/comment-types';

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCommentDto, userId: string): Promise<Comment> {
    try {
      return await this.prisma.comment.create({
        data: {
          content: dto.content,
          postId: dto.postId,
          userId: userId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new NotFoundException('Post não encontrado');
      }
      throw new InternalServerErrorException('Erro ao criar comentário');
    }
  }

  async findByPost(
    dto: PaginationDto,
    postId: string,
  ): Promise<PaginatedQuery<CommentWithUser>> {
    const take = Number(dto.limit) || 10;

    if (take >= 100)
      throw new InternalServerErrorException('O limite máximo é 100');

    try {
      const searchedComments = await this.prisma.comment.findMany({
        take: take + 1,
        cursor: dto.cursor ? { id: dto.cursor } : undefined,
        skip: dto.cursor ? 1 : 0,
        orderBy: { createdAt: 'desc' },
        where: { postId: postId },
        include: { user: { select: { id: true, name: true } } },
      });

      const hasNextPage = searchedComments.length > take;
      const comments = hasNextPage
        ? searchedComments.slice(0, -1)
        : searchedComments;
      const finalItem = comments[comments.length - 1];

      return {
        data: comments,
        nextCursor: hasNextPage ? finalItem.id : null,
        hasNextPage: hasNextPage,
      };
    } catch (error) {
      throw new InternalServerErrorException('Erro ao buscar comentários');
    }
  }

  async findByUser(
    dto: PaginationDto,
    id: string,
  ): Promise<PaginatedQuery<Comment>> {
    const take = Number(dto.limit) || 10;

    if (take >= 100)
      throw new InternalServerErrorException('O limite máximo é 100');

    try {
      const searchedComments = await this.prisma.comment.findMany({
        take: take + 1,
        cursor: dto.cursor ? { id: dto.cursor } : undefined,
        skip: dto.cursor ? 1 : 0,
        orderBy: { createdAt: 'desc' },
        where: { userId: id },
      });

      const hasNextPage = searchedComments.length > take;
      const comments = hasNextPage
        ? searchedComments.slice(0, -1)
        : searchedComments;
      const finalItem = comments[comments.length - 1];

      return {
        data: comments,
        nextCursor: hasNextPage ? finalItem.id : null,
        hasNextPage: hasNextPage,
      };
    } catch (error) {
      throw new InternalServerErrorException('Erro ao buscar comentários');
    }
  }

  async findOne(id: string): Promise<Comment> {
    try {
      const comment = await this.prisma.comment.findUnique({
        where: { id },
      });

      if (!comment) {
        throw new NotFoundException('Comentário não encontrado');
      }

      return comment;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Erro ao buscar comentário');
    }
  }

  async update(
    id: string,
    dto: UpdateCommentDto,
    userId: string,
  ): Promise<Comment> {
    try {
      const comment = await this.prisma.comment.findUnique({
        where: { id },
      });

      if (!comment) {
        throw new NotFoundException('Comentário não encontrado');
      }

      if (comment.userId !== userId) {
        throw new UnauthorizedException(
          'Você não tem permissão para atualizar este comentário',
        );
      }

      return await this.prisma.comment.update({
        where: { id },
        data: {
          content: dto.content,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof UnauthorizedException) throw error;
      throw new InternalServerErrorException('Erro ao atualizar comentário');
    }
  }

  async remove(id: string, userId: string): Promise<Comment> {
    try {
      const comment = await this.prisma.comment.findUnique({
        where: { id },
        include: { post: { select: { userId: true } } },
      });

      if (!comment) {
        throw new NotFoundException('Comentário não encontrado');
      }

      // Autor do comentário ou autor do post (moderação do próprio post)
      if (comment.userId !== userId && comment.post.userId !== userId) {
        throw new UnauthorizedException(
          'Você não tem permissão para deletar este comentário',
        );
      }

      return await this.prisma.comment.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof UnauthorizedException) throw error;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Comentário não encontrado');
      }
      throw new InternalServerErrorException('Erro ao deletar comentário');
    }
  }
}
