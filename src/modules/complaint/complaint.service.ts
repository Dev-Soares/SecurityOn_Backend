import { Injectable, NotFoundException,
   InternalServerErrorException, ConflictException } from '@nestjs/common';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { PrismaService } from '../database/prisma.service';
import { Prisma, Complaint } from '@prisma/client';


@Injectable()
export class ComplaintService {
  constructor(private readonly prisma: PrismaService) {}

  create(createComplaintDto: CreateComplaintDto): Promise<Complaint> {
    try {
      return this.prisma.complaint.create({
        data: {
          content: createComplaintDto.content,
          userId: createComplaintDto.userId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Complaint já cadastrado');
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

  async findOne(id: string): Promise<Complaint | null> {
    try {
      const complaint = await this.prisma.complaint.findUnique({
        where: { id: id },
      });

      return complaint;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Denúncia não encontrada');
      }
      throw new InternalServerErrorException('Erro ao buscar Denúncia');
    }
  }

  async update(
    id: string,
    updateComplaintDto: UpdateComplaintDto,
  ): Promise<Complaint> {
    try {
      return await this.prisma.complaint.update({
        where: { id },
        data: {
          content: updateComplaintDto.content,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
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
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Denúncia não encontrada');
      }
      throw new InternalServerErrorException('Erro ao deletar Denúncia');
    }
  }
}
