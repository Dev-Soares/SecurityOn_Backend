import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma, User } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';
import { HashService } from '../../common/hash/hash.service'

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: HashService,
   ) {}

  async create(data: Prisma.UserCreateInput): Promise<User> {
    const hashedPassword = await this.hashService.hashPassword(data.password);
    try {
      return await this.prisma.user.create({ data: {
        name: data.name,
        email: data.email,
        password: hashedPassword
      } });
    } catch (error) {
      console.log(error);
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
    try {
      const user = await this.prisma.user.findUnique({
      where: uniqueInput,
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

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    try {
      return this.prisma.user.update({
        where: { id },
        data:{
          name: dto.name,         
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

  async remove(id: string): Promise<User> {
    try {
      return this.prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      throw new InternalServerErrorException('Erro ao deletar usuário');
    }
  }
}
