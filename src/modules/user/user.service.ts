import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma, User } from 'src/generated/prisma/client';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput): Promise<User> {
    try {
      return await this.prisma.user.create({ data });
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

  findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  async findOne(uniqueInput: Prisma.UserWhereUniqueInput): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: uniqueInput,
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  async update(id: number, dataInput: Prisma.UserUpdateInput): Promise<User> {
    try {
      return this.prisma.user.update({
        where: { id },
        data: dataInput,
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

  async remove(id: number): Promise<User> {
    try {
      return this.prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      throw new InternalServerErrorException('Erro ao deletar usuário');
    }
  }
}
