import { Injectable, NotFoundException, BadRequestException,
   InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { SearchComplaintDto } from './dto/search-complaint.dto';
import { PrismaService } from '../database/prisma.service';
import { Complaint } from '@prisma/client';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { PaginatedQuery } from 'src/common/types/query-types';
import { ComplaintSiteSearch } from './types/complaint-types';
import { baseDomain, isSameSite, normalizeHost } from './utils/domain';

// Teto de candidatos lidos do banco por domínio registrável. O filtro final é em
// memória, então o número é o limite real da verificação: acima dele o total sai menor
// que a realidade. Um domínio sozinho não chega perto disso, quando chegar, o caminho
// é guardar o host normalizado numa coluna indexada e filtrar no SQL.
const SITE_SEARCH_CANDIDATE_LIMIT = 100;


@Injectable()
export class ComplaintService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createComplaintDto: CreateComplaintDto, userId: string): Promise<Complaint> {
    try {
      return await this.prisma.complaint.create({
        data: {
          title: createComplaintDto.title,
          content: createComplaintDto.content,
          danger: createComplaintDto.danger,
          store: createComplaintDto.store,
          link: createComplaintDto.link,
          userId: userId
        },
      });
    } catch (error) {
      throw new InternalServerErrorException('Erro ao fazer Denúncia');
    }
  }

  async findByUser(dto: PaginationDto, id: string): Promise<PaginatedQuery<Complaint>> {

    const take = Number(dto.limit) || 10;
    if (take >= 100) throw new InternalServerErrorException('O limite máximo é 100')
    try {
      const searchedComplaints = await this.prisma.complaint.findMany({
        take: take + 1,
        cursor: dto.cursor ? { id: dto.cursor } : undefined,
        skip: dto.cursor ? 1 : 0,
        orderBy: { createdAt: 'desc' },
        where: { userId: id }
      });

      const hasNextPage = searchedComplaints.length > take;
      const complaints = hasNextPage ? searchedComplaints.slice(0, -1) : searchedComplaints;
      const finalItem = complaints[complaints.length - 1];

      return {
        data: complaints,
        nextCursor: hasNextPage ? finalItem.id : null,
        hasNextPage: hasNextPage,
      }
    } catch (error) {
      throw new InternalServerErrorException('Erro ao buscar Denúncias');
    }
  }

  async findAll(dto: PaginationDto): Promise<PaginatedQuery<Complaint>> {

    const take = Number(dto.limit) || 10;
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

  // Verificação de site: devolve as denúncias feitas contra o endereço colado.
  // Lista vazia aqui não é erro nem atestado de site idôneo, é ausência de denúncia,
  // e a tela precisa dizer isso com essas palavras.
  async findByLink(dto: SearchComplaintDto): Promise<ComplaintSiteSearch> {

    const host = normalizeHost(dto.url);
    if (!host) throw new BadRequestException('Informe um endereço de site válido');

    const base = baseDomain(host);

    try {
      // O contains é só o pré-filtro: pega todo link que mencione o domínio
      // registrável e deixa a decisão de host para isSameSite, que recusa
      // "outraloja.com" e "loja.com.golpe.net".
      const candidates = await this.prisma.complaint.findMany({
        take: SITE_SEARCH_CANDIDATE_LIMIT,
        orderBy: { createdAt: 'desc' },
        where: { link: { contains: base, mode: 'insensitive' } },
      });

      const complaints = candidates.filter((complaint) => {
        const candidateHost = normalizeHost(complaint.link);
        return candidateHost !== null && isSameSite(candidateHost, host);
      });

      return {
        query: dto.url.trim(),
        domain: host,
        found: complaints.length > 0,
        total: complaints.length,
        data: complaints,
      };
    } catch (error) {
      throw new InternalServerErrorException('Erro ao verificar o site');
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
          title: updateComplaintDto.title,
          content: updateComplaintDto.content,
          danger: updateComplaintDto.danger,
          store: updateComplaintDto.store,
          link: updateComplaintDto.link,
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
