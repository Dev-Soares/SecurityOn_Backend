import { Injectable, NotFoundException,
   InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { PrismaService } from '../database/prisma.service';
import { Complaint } from '@prisma/client';
import { GetComplaintDto } from './dto/get-complaint.dto';
import { ComplaintQuery } from 'src/common/types/query-types';


@Injectable()
export class ComplaintService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createComplaintDto: CreateComplaintDto, userId: string): Promise<Complaint> {
    try {
      return await this.prisma.complaint.create({
        data: {
          content: createComplaintDto.content,
          userId: userId
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Erro ao fazer Denúncia');
    }
  }

  async findAll(dto: GetComplaintDto): Promise<ComplaintQuery> {

    const take = Number(dto.limit) || 6;
    if (take >= 100) throw new InternalServerErrorException('O limite máximo é 100')
    try {
      const searchedComplaints = await this.prisma.complaint.findMany({
        take: take + 1,
        cursor: dto.cursor ? { id: dto.cursor } : undefined,
        skip: dto.cursor ? 1 : 0,
        orderBy: { createdAt: 'desc' },
      });

      const hasNextPage = searchedComplaints.length > take;
      const complaints = hasNextPage ? searchedComplaints.slice(0, -1) : searchedComplaints;
      const finalItem = complaints[complaints.length - 1];

      return {
        data: complaints,
        nextCursor: hasNextPage ? finalItem.id : null,
        hasNextPage: hasNextPage
      }
    } catch (error) {
      throw new InternalServerErrorException('Erro ao buscar Denúncias');
    }
  }

  async findOne(id: string): Promise<Complaint> {
    try {
      const complaint = await this.prisma.complaint.findUnique({
        where: { id: id },
      });

      if (!complaint) {
        throw new NotFoundException('Denúncia não encontrada');
      }

      return complaint;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Erro ao buscar Denúncia');
    }
  }

  async update(
    id: string,
    updateComplaintDto: UpdateComplaintDto,
    userId: string,
  ): Promise<Complaint> {
    try {
      const complaint = await this.prisma.complaint.findUnique({
        where: { id },
      });

      if (!complaint) {
        throw new NotFoundException('Denúncia não encontrada');
      }

      if (complaint.userId !== userId) {
        throw new UnauthorizedException('Você não tem permissão para atualizar esta denúncia');
      }

      return await this.prisma.complaint.update({
        where: { id },
        data: {
          content: updateComplaintDto.content,
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof UnauthorizedException) throw error;
      throw new InternalServerErrorException('Erro ao atualizar Denúncia');
    }
  }

  async remove(id: string, userId: string): Promise<Complaint> {
    try {
      const complaint = await this.prisma.complaint.findUnique({
        where: { id },
      });

      if (!complaint) {
        throw new NotFoundException('Denúncia não encontrada');
      }

      if (complaint.userId !== userId) {
        throw new UnauthorizedException('Você não tem permissão para deletar esta denúncia');
      }

      return await this.prisma.complaint.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof UnauthorizedException) throw error;
      throw new InternalServerErrorException('Erro ao deletar Denúncia');
    }
  }
}
