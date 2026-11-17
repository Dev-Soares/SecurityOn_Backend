import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { FriendshipStatus, Prisma, User } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';
import { HashService } from '../../common/hash/hash.service';
import { PublicUser } from './types/user-types';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: HashService,
  ) {}

  async create(data: Prisma.UserCreateInput): Promise<Omit<User, 'password'>> {
    const hashedPassword = await this.hashService.hashPassword(data.password);
    try {
      return await this.prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: hashedPassword,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('E-mail já cadastrado');
      }
      throw new InternalServerErrorException('Erro ao criar usuário');
    }
  }

  async findOneWithPassword(uniqueInput: Prisma.UserWhereUniqueInput): Promise<User> {
    try {
      const user = await this.prisma.user.findUnique({
        where: uniqueInput,
      });

      if (!user) {
        throw new UnauthorizedException('Email ou senha inválidos');
      }

      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error
      throw new InternalServerErrorException('Erro ao buscar usuário');
    }
  }

  async findOne(uniqueInput: Prisma.UserWhereUniqueInput): Promise<PublicUser> {
    try {
      const user = await this.prisma.user.findUnique({
        where: uniqueInput,
        select: {
          id: true,
          name: true,
          email: true,
          // Os números do perfil saem na mesma query, como subconsultas de
          // COUNT — não como findMany que o front teria de paginar só para
          // escrever um total.
          //
          // Uma amizade é UMA linha, e o usuário pode estar em qualquer um dos
          // dois lados dela: contar só um lado conta metade dos amigos.
          _count: {
            select: {
              posts: true,
              complaints: true,
              articles: true,
              sentRequests: { where: { status: FriendshipStatus.ACCEPTED } },
              receivedRequests: { where: { status: FriendshipStatus.ACCEPTED } },
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('Usuário não encontrado');
      }

      const { _count, ...rest } = user;

      return {
        ...rest,
        _count: {
          posts: _count.posts,
          complaints: _count.complaints,
          articles: _count.articles,
          friends: _count.sentRequests + _count.receivedRequests,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Erro ao buscar usuário');
    }
  }

  async update(id: string, dto: UpdateUserDto, userId: string): Promise<Omit<User, 'password'>> {

    if (id !== userId) {
      throw new UnauthorizedException('Sem autorização para atualizar este usuário');
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          name: dto.name,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('E-mail já cadastrado');
      }
      throw new InternalServerErrorException(
        'Erro ao atualizar informações do Usuário',
      );
    }
  }

  async remove(id: string, userId: string): Promise<Omit<User, 'password'>> {
    if (id !== userId) {
      throw new UnauthorizedException('Sem autorização para deletar este usuário');
    }
    try {
      return await this.prisma.user.delete({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Erro ao deletar usuário');
    }
  }
}
