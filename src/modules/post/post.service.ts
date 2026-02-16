import { Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Post, Prisma } from '@prisma/client';
import { GetPostDto } from './dto/get-post.dto';

@Injectable()
export class PostService {
  constructor (private readonly prisma: PrismaService) {}

  async create(dto: CreatePostDto, userId: string): Promise<Post> {
    try{
      return await this.prisma.post.create({
        data: {
          content: dto.content,
          userId: userId,
          imgUrl: dto.imgUrl,
        },
      });
    } catch(error){
      throw new InternalServerErrorException('Erro ao criar post');
    }
  }

  async findAll(dto: GetPostDto): Promise<Object> {

    const take = Number(dto.limit) || 10;

    try{
      const searchedPosts = await this.prisma.post.findMany({
        take: take + 1,
        cursor: dto.cursor ? { id: dto.cursor } : undefined,
        skip: dto.cursor ? 1 : 0,
        orderBy: { createdAt: 'desc' },
      });

      const hasNextPage = searchedPosts.length > take;
      const posts = hasNextPage ? searchedPosts.slice(0, -1) : searchedPosts;
      const finalItem = posts[posts.length - 1];

      return {
        data: posts,
        nextCursor: hasNextPage ? finalItem.id : null,
        hasNextPage: hasNextPage
      };
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

  async update(id: string, dto: UpdatePostDto, userId: string): Promise<Post> {
    try{
      const post = await this.prisma.post.findUnique({
        where: { id },
      });

      if (!post) {
        throw new NotFoundException('Post não encontrado');
      }

      if (post.userId !== userId) {
        throw new UnauthorizedException('Você não tem permissão para atualizar este post');
      }

      return await this.prisma.post.update({
        where: { id },
        data: {
          content: dto.content,
          imgUrl: dto.imgUrl,
        },
      });
    } catch(error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof UnauthorizedException) throw error;
      throw new InternalServerErrorException('Erro ao atualizar post');
    }
  }

  async remove(id: string, userId: string): Promise<Post> {
    try {

      const post = await this.prisma.post.findUnique({
        where: { id },
      });

      if (!post) {
        throw new NotFoundException('Post não encontrado');
      }

      if(post?.userId !== userId) {
        throw new UnauthorizedException('Você não tem permissão para deletar este post');
      }

      return await this.prisma.post.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      if (error instanceof NotFoundException) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Post não encontrado');
      }
      throw new InternalServerErrorException('Erro ao deletar post');
    }
  }
}
