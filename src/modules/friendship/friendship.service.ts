import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateFriendshipDto } from './dto/create-friendship.dto';
import { Friendship, FriendshipStatus, Prisma } from '@prisma/client';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { PaginatedQuery } from 'src/common/types/query-types';
import {
  FriendRequestWithUser,
  FriendSummary,
  FriendshipStatusResult,
  SentFriendRequestWithUser,
} from './types/friendship-types';

@Injectable()
export class FriendshipService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateFriendshipDto,
    requesterId: string,
  ): Promise<Friendship> {
    if (dto.addresseeId === requesterId) {
      throw new BadRequestException(
        'Não é possível enviar pedido de amizade para si mesmo',
      );
    }

    try {
      const addressee = await this.prisma.user.findUnique({
        where: { id: dto.addresseeId },
      });

      if (!addressee) {
        throw new NotFoundException('Usuário não encontrado');
      }

      const existing = await this.prisma.friendship.findFirst({
        where: {
          OR: [
            { requesterId: requesterId, addresseeId: dto.addresseeId },
            { requesterId: dto.addresseeId, addresseeId: requesterId },
          ],
        },
      });

      if (existing) {
        if (existing.status === FriendshipStatus.ACCEPTED) {
          throw new ConflictException('Vocês já são amigos');
        }
        if (existing.requesterId === requesterId) {
          throw new ConflictException('Pedido de amizade já enviado');
        }
        throw new ConflictException(
          'Este usuário já te enviou um pedido de amizade',
        );
      }

      return await this.prisma.friendship.create({
        data: {
          requesterId: requesterId,
          addresseeId: dto.addresseeId,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof ConflictException) throw error;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Pedido de amizade já enviado');
      }
      throw new InternalServerErrorException(
        'Erro ao enviar pedido de amizade',
      );
    }
  }

  async findReceived(
    dto: PaginationDto,
    userId: string,
  ): Promise<PaginatedQuery<FriendRequestWithUser>> {
    const take = Number(dto.limit) || 10;

    if (take >= 100)
      throw new InternalServerErrorException('O limite máximo é 100');

    try {
      const searchedRequests = await this.prisma.friendship.findMany({
        take: take + 1,
        cursor: dto.cursor ? { id: dto.cursor } : undefined,
        skip: dto.cursor ? 1 : 0,
        orderBy: { createdAt: 'desc' },
        where: { addresseeId: userId, status: FriendshipStatus.PENDING },
        include: { requester: { select: { id: true, name: true } } },
      });

      const hasNextPage = searchedRequests.length > take;
      const requests = hasNextPage
        ? searchedRequests.slice(0, -1)
        : searchedRequests;
      const finalItem = requests[requests.length - 1];

      return {
        data: requests,
        nextCursor: hasNextPage ? finalItem.id : null,
        hasNextPage: hasNextPage,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro ao buscar pedidos de amizade',
      );
    }
  }

  async findSent(
    dto: PaginationDto,
    userId: string,
  ): Promise<PaginatedQuery<SentFriendRequestWithUser>> {
    const take = Number(dto.limit) || 10;

    if (take >= 100)
      throw new InternalServerErrorException('O limite máximo é 100');

    try {
      const searchedRequests = await this.prisma.friendship.findMany({
        take: take + 1,
        cursor: dto.cursor ? { id: dto.cursor } : undefined,
        skip: dto.cursor ? 1 : 0,
        orderBy: { createdAt: 'desc' },
        where: { requesterId: userId, status: FriendshipStatus.PENDING },
        include: { addressee: { select: { id: true, name: true } } },
      });

      const hasNextPage = searchedRequests.length > take;
      const requests = hasNextPage
        ? searchedRequests.slice(0, -1)
        : searchedRequests;
      const finalItem = requests[requests.length - 1];

      return {
        data: requests,
        nextCursor: hasNextPage ? finalItem.id : null,
        hasNextPage: hasNextPage,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro ao buscar pedidos de amizade',
      );
    }
  }

  async findFriends(
    dto: PaginationDto,
    id: string,
  ): Promise<PaginatedQuery<FriendSummary>> {
    const take = Number(dto.limit) || 10;

    if (take >= 100)
      throw new InternalServerErrorException('O limite máximo é 100');

    try {
      const searchedFriendships = await this.prisma.friendship.findMany({
        take: take + 1,
        cursor: dto.cursor ? { id: dto.cursor } : undefined,
        skip: dto.cursor ? 1 : 0,
        orderBy: { createdAt: 'desc' },
        where: {
          status: FriendshipStatus.ACCEPTED,
          OR: [{ requesterId: id }, { addresseeId: id }],
        },
        include: {
          requester: { select: { id: true, name: true } },
          addressee: { select: { id: true, name: true } },
        },
      });

      const hasNextPage = searchedFriendships.length > take;
      const friendships = hasNextPage
        ? searchedFriendships.slice(0, -1)
        : searchedFriendships;
      const finalItem = friendships[friendships.length - 1];

      return {
        data: friendships.map((friendship) => ({
          friendshipId: friendship.id,
          friendsSince: friendship.createdAt,
          user:
            friendship.requesterId === id
              ? friendship.addressee
              : friendship.requester,
        })),
        nextCursor: hasNextPage ? finalItem.id : null,
        hasNextPage: hasNextPage,
      };
    } catch (error) {
      throw new InternalServerErrorException('Erro ao buscar amigos');
    }
  }

  async findStatus(
    id: string,
    userId: string,
  ): Promise<FriendshipStatusResult> {
    if (id === userId) {
      return { userId: id, relation: 'self', friendshipId: null };
    }

    try {
      const friendship = await this.prisma.friendship.findFirst({
        where: {
          OR: [
            { requesterId: userId, addresseeId: id },
            { requesterId: id, addresseeId: userId },
          ],
        },
      });

      if (!friendship) {
        return { userId: id, relation: 'none', friendshipId: null };
      }

      if (friendship.status === FriendshipStatus.ACCEPTED) {
        return { userId: id, relation: 'friends', friendshipId: friendship.id };
      }

      return {
        userId: id,
        relation:
          friendship.requesterId === userId
            ? 'pending_sent'
            : 'pending_received',
        friendshipId: friendship.id,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro ao buscar status de amizade',
      );
    }
  }

  async accept(id: string, userId: string): Promise<Friendship> {
    try {
      const friendship = await this.prisma.friendship.findUnique({
        where: { id },
      });

      if (!friendship) {
        throw new NotFoundException('Pedido de amizade não encontrado');
      }

      if (friendship.addresseeId !== userId) {
        throw new UnauthorizedException(
          'Você não tem permissão para aceitar este pedido',
        );
      }

      if (friendship.status === FriendshipStatus.ACCEPTED) {
        throw new ConflictException('Pedido de amizade já aceito');
      }

      return await this.prisma.friendship.update({
        where: { id },
        data: { status: FriendshipStatus.ACCEPTED },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof UnauthorizedException) throw error;
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException(
        'Erro ao aceitar pedido de amizade',
      );
    }
  }

  async remove(id: string, userId: string): Promise<Friendship> {
    try {
      const friendship = await this.prisma.friendship.findUnique({
        where: { id },
      });

      if (!friendship) {
        throw new NotFoundException('Pedido de amizade não encontrado');
      }

      // Cobre cancelar pedido enviado, recusar pedido recebido e desfazer amizade
      if (
        friendship.requesterId !== userId &&
        friendship.addresseeId !== userId
      ) {
        throw new UnauthorizedException(
          'Você não tem permissão para remover esta amizade',
        );
      }

      return await this.prisma.friendship.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof UnauthorizedException) throw error;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Pedido de amizade não encontrado');
      }
      throw new InternalServerErrorException('Erro ao remover amizade');
    }
  }
}
