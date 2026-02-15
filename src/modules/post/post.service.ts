import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Post, Prisma } from '@prisma/client';

@Injectable()
export class PostService {
  constructor (private readonly prisma: PrismaService) {}

  async create(dto: CreatePostDto): Promise<Post> {
    try{
      return await this.prisma.post.create({
        data: {
          content: dto.content,
          userId: dto.userId,
          imgUrl: dto.imgUrl,
        },
      });
    } catch(error){
      if( error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' ){
        throw new Error('Post já cadastrado');
      }
      throw new InternalServerErrorException('Erro ao criar post');
    }
  }

  async findAll(): Promise<Post[]> {
    try{
      return await this.prisma.post.findMany();
    } catch (error){
      throw new InternalServerErrorException('Erro ao buscar posts');
    }
  }

  async findOne(id: string): Promise<Post> {
    try{
      const post = await this.prisma.post.findUnique({
        where: { id }
      });
      if (!post) {
        throw new NotFoundException('Post não encontrado');
      }
      return post;
    } catch(error){
      if (error instanceof NotFoundException) throw error;
      throw new NotFoundException('Erro ao buscar post');
    }
  }

  async update(id: string, dto: UpdatePostDto): Promise<Post> {
    try{
      return await this.prisma.post.update({
        where: { id },
        data: {
          content: dto.content,
          imgUrl: dto.imgUrl,
        },
      });
    } catch(error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Post não encontrado');
      } else {
        throw new InternalServerErrorException('Erro ao atualizar post');
      }
    }
  }

  async remove(id: string): Promise<Post> {
    try {
      return await this.prisma.post.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Post não encontrado');
      } else {
        throw new InternalServerErrorException('Erro ao deletar post');
      }
    }
  }
}
