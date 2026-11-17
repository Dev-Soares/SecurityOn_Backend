import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateLikeDto } from './dto/create-like.dto';
import { Like, Prisma } from '@prisma/client';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { PaginatedQuery } from 'src/common/types/query-types';
import { LikeStatus, LikeWithUser } from './types/like-types';

@Injectable()
export class LikeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLikeDto, userId: string): Promise<LikeStatus> {
    try {
      // $transaction com array roda as duas operações em ordem, numa única ida ao
      // banco e na mesma transação — então o count já enxerga o insert.
      const [, total] = await this.prisma.$transaction([
        this.prisma.like.create({
          data: {
            postId: dto.postId,
            userId: userId,
          },
        }),
        this.prisma.like.count({
          where: { postId: dto.postId },
        }),
      ]);

      return {
        postId: dto.postId,
        total: total,
        liked: true,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Você já curtiu este post');
        }
        if (error.code === 'P2003') {
          throw new NotFoundException('Post não encontrado');
        }
      }
      throw new InternalServerErrorException('Erro ao curtir post');
    }
  }

  async findByPost(
    dto: PaginationDto,
    postId: string,
  ): Promise<PaginatedQuery<LikeWithUser>> {
    const take = Number(dto.limit) || 10;

    if (take >= 100)
      throw new InternalServerErrorException('O limite máximo é 100');

    try {
      const searchedLikes = await this.prisma.like.findMany({
        take: take + 1,
        cursor: dto.cursor ? { id: dto.cursor } : undefined,
        skip: dto.cursor ? 1 : 0,
        orderBy: { createdAt: 'desc' },
        where: { postId: postId },
        include: { user: { select: { id: true, name: true } } },
      });

      const hasNextPage = searchedLikes.length > take;
      const likes = hasNextPage ? searchedLikes.slice(0, -1) : searchedLikes;
      const finalItem = likes[likes.length - 1];

      return {
        data: likes,
        nextCursor: hasNextPage ? finalItem.id : null,
        hasNextPage: hasNextPage,
      };
    } catch (error) {
      throw new InternalServerErrorException('Erro ao buscar curtidas');
    }
  }

  async findByUser(
    dto: PaginationDto,
    id: string,
  ): Promise<PaginatedQuery<Like>> {
    const take = Number(dto.limit) || 10;

    if (take >= 100)
      throw new InternalServerErrorException('O limite máximo é 100');

    try {
      const searchedLikes = await this.prisma.like.findMany({
        take: take + 1,
        cursor: dto.cursor ? { id: dto.cursor } : undefined,
        skip: dto.cursor ? 1 : 0,
        orderBy: { createdAt: 'desc' },
        where: { userId: id },
      });

      const hasNextPage = searchedLikes.length > take;
      const likes = hasNextPage ? searchedLikes.slice(0, -1) : searchedLikes;
      const finalItem = likes[likes.length - 1];

      return {
        data: likes,
        nextCursor: hasNextPage ? finalItem.id : null,
        hasNextPage: hasNextPage,
      };
    } catch (error) {
      throw new InternalServerErrorException('Erro ao buscar curtidas');
    }
  }

  async remove(postId: string, userId: string): Promise<LikeStatus> {
    try {
      // deleteMany em vez de delete: casa no par ("userId","postId") sem precisar
      // de um findUnique antes, e devolve a contagem de linhas afetadas em vez de
      // lançar P2025 quando não encontra nada. Tudo numa ida ao banco.
      const [deleted, total] = await this.prisma.$transaction([
        this.prisma.like.deleteMany({
          where: { userId: userId, postId: postId },
        }),
        this.prisma.like.count({
          where: { postId: postId },
        }),
      ]);

      if (deleted.count === 0) {
        throw new NotFoundException('Curtida não encontrada');
      }

      return {
        postId: postId,
        total: total,
        liked: false,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Erro ao descurtir post');
    }
  }
}
