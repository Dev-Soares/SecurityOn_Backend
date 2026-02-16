import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma, User } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';
import { HashService } from '../../common/hash/hash.service';

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
      throw new InternalServerErrorException('Erro ao criar usuário');
    }
  }

  async findOneWithPassword(uniqueInput: Prisma.UserWhereUniqueInput): Promise<User> {
    try {
      const user = await this.prisma.user.findUnique({
        where: uniqueInput,
      });

      if (!user) {
        throw new UnauthorizedException('Usuário não encontrado');
      }

      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error
      throw new InternalServerErrorException('Erro ao buscar usuário');
    }
  }

  async findOne(uniqueInput: Prisma.UserWhereUniqueInput): Promise<Omit<User, 'password'>> {
    try {
      const user = await this.prisma.user.findUnique({
        where: uniqueInput,
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      if (!user) {
        throw new NotFoundException('Usuário não encontrado');
      }

      return user;
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
