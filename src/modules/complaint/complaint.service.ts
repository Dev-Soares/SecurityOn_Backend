import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { PrismaService } from '../database/prisma.service';
import { Prisma, Complaint } from 'src/generated/prisma/client';
import { InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class ComplaintService {

  constructor(private readonly prisma: PrismaService) {}

  create(createComplaintDto: CreateComplaintDto): Promise<Complaint> {
    try{
      return this.prisma.complaint.create({
        data: {
          content: createComplaintDto.content,
          authorID: createComplaintDto.authorId,
          author: {
            connect: { id: createComplaintDto.authorId }
          }
        },
      });
    } catch (error){
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new Error('Complaint já cadastrado');
      }
      throw new InternalServerErrorException('Erro ao fazer Denúncia');

    } 
  }

  async findAll(): Promise<Complaint[]> {
    try {
      return await this.prisma.complaint.findMany();
    } catch (error) {
      throw new InternalServerErrorException('Erro ao buscar Denúncias');
    }
  }

  async findOne(id: string): Promise<Complaint> {
    try {
      return await this.prisma.complaint.findUnique({
        where: { id }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Denúncia não encontrada');
      }
      throw new InternalServerErrorException('Erro ao buscar Denúncia');
    }
  }

  async update(id: string, updateComplaintDto: UpdateComplaintDto): Promise<Complaint> {
    try {
      return await this.prisma.complaint.update({
        where: { id },
        data: {
          content: updateComplaintDto.content,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Denúncia não encontrada');
      }
      throw new InternalServerErrorException('Erro ao atualizar Denúncia');
    }
  }

  async remove(id: string): Promise<Complaint> {
    try {
      return await this.prisma.complaint.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Denúncia não encontrada');
      }
      throw new InternalServerErrorException('Erro ao deletar Denúncia');
    }
  }
}
