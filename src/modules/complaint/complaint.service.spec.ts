import { Test, TestingModule } from '@nestjs/testing';
import {
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ComplaintService } from './complaint.service';
import { PrismaService } from '../database/prisma.service';
import { prismaMock, resetPrismaMock } from '../../../test/prisma.mock';

const makeComplaint = (id: string, userId = 'user-1') => ({
  id,
  title: `titulo ${id}`,
  content: `conteudo ${id}`,
  danger: 'aviso',
  store: null,
  link: null,
  userId,
  createdAt: new Date('2026-01-01T00:00:00Z'),
});

describe('ComplaintService', () => {
  let service: ComplaintService;

  const userId = 'user-1';
  const complaint = makeComplaint('complaint-1');

  beforeEach(async () => {
    resetPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplaintService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ComplaintService>(ComplaintService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('cria a denúncia vinculada ao usuário autenticado', async () => {
      prismaMock.complaint.create.mockResolvedValue(complaint);

      const dto = {
        title: 'titulo complaint-1',
        content: 'conteudo complaint-1',
        danger: 'alto',
        store: 'Loja X',
        link: 'https://exemplo.com',
      };

      const result = await service.create(dto as any, userId);

      expect(prismaMock.complaint.create).toHaveBeenCalledWith({
        data: { ...dto, userId },
      });
      expect(result).toEqual(complaint);
    });

    it('lança InternalServerErrorException em falha do banco', async () => {
      prismaMock.complaint.create.mockRejectedValue(new Error('db down'));

      await expect(
        service.create({ title: 't', content: 'c' } as any, userId),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findAll', () => {
    it('usa limite padrão de 10 e busca take + 1 registros', async () => {
      prismaMock.complaint.findMany.mockResolvedValue([complaint]);

      const result = await service.findAll({});

      expect(prismaMock.complaint.findMany).toHaveBeenCalledWith({
        take: 11,
        cursor: undefined,
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.data).toEqual([complaint]);
      expect(result.hasNextPage).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('aplica o cursor e pula o registro do cursor', async () => {
      prismaMock.complaint.findMany.mockResolvedValue([complaint]);

      await service.findAll({ cursor: 'complaint-0', limit: '5' });

      expect(prismaMock.complaint.findMany).toHaveBeenCalledWith({
        take: 6,
        cursor: { id: 'complaint-0' },
        skip: 1,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('descarta o registro extra e devolve nextCursor quando há próxima página', async () => {
      const complaints = Array.from({ length: 3 }, (_, i) =>
        makeComplaint(`complaint-${i}`),
      );
      prismaMock.complaint.findMany.mockResolvedValue(complaints);

      const result = await service.findAll({ limit: '2' });

      expect(result.data).toHaveLength(2);
      expect(result.hasNextPage).toBe(true);
      expect(result.nextCursor).toBe('complaint-1');
    });

    it('rejeita limite maior ou igual a 100', async () => {
      await expect(service.findAll({ limit: '100' })).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(prismaMock.complaint.findMany).not.toHaveBeenCalled();
    });

    it('lança InternalServerErrorException em falha do banco', async () => {
      prismaMock.complaint.findMany.mockRejectedValue(new Error('db down'));

      await expect(service.findAll({})).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findByUser', () => {
    it('filtra as denúncias pelo userId informado', async () => {
      prismaMock.complaint.findMany.mockResolvedValue([complaint]);

      const result = await service.findByUser({ limit: '5' }, userId);

      expect(prismaMock.complaint.findMany).toHaveBeenCalledWith({
        take: 6,
        cursor: undefined,
        skip: 0,
        orderBy: { createdAt: 'desc' },
        where: { userId },
      });
      expect(result.data).toEqual([complaint]);
    });

    it('rejeita limite maior ou igual a 100', async () => {
      await expect(
        service.findByUser({ limit: '150' }, userId),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('lança InternalServerErrorException em falha do banco', async () => {
      prismaMock.complaint.findMany.mockRejectedValue(new Error('db down'));

      await expect(service.findByUser({}, userId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findOne', () => {
    it('retorna a denúncia encontrada', async () => {
      prismaMock.complaint.findUnique.mockResolvedValue(complaint);

      await expect(service.findOne('complaint-1')).resolves.toEqual(complaint);
      expect(prismaMock.complaint.findUnique).toHaveBeenCalledWith({
        where: { id: 'complaint-1' },
      });
    });

    it('lança NotFoundException quando a denúncia não existe', async () => {
      prismaMock.complaint.findUnique.mockResolvedValue(null);

      await expect(service.findOne('inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lança InternalServerErrorException em falha do banco', async () => {
      prismaMock.complaint.findUnique.mockRejectedValue(new Error('db down'));

      await expect(service.findOne('complaint-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('update', () => {
    it('atualiza a denúncia do próprio dono', async () => {
      prismaMock.complaint.findUnique.mockResolvedValue(complaint);
      prismaMock.complaint.update.mockResolvedValue({
        ...complaint,
        title: 'novo',
      });

      const dto = {
        title: 'novo',
        content: 'novo conteudo',
        danger: 'alto',
        store: 'Loja Y',
        link: null,
      };

      const result = await service.update('complaint-1', dto as any, userId);

      expect(prismaMock.complaint.update).toHaveBeenCalledWith({
        where: { id: 'complaint-1' },
        data: dto,
      });
      expect(result.title).toBe('novo');
    });

    it('lança NotFoundException quando a denúncia não existe', async () => {
      prismaMock.complaint.findUnique.mockResolvedValue(null);

      await expect(
        service.update('inexistente', { title: 'x' } as any, userId),
      ).rejects.toThrow(NotFoundException);
      expect(prismaMock.complaint.update).not.toHaveBeenCalled();
    });

    it('lança UnauthorizedException quando a denúncia é de outro usuário', async () => {
      prismaMock.complaint.findUnique.mockResolvedValue(
        makeComplaint('complaint-1', 'outro'),
      );

      await expect(
        service.update('complaint-1', { title: 'x' } as any, userId),
      ).rejects.toThrow(UnauthorizedException);
      expect(prismaMock.complaint.update).not.toHaveBeenCalled();
    });

    it('lança InternalServerErrorException em falha do banco', async () => {
      prismaMock.complaint.findUnique.mockResolvedValue(complaint);
      prismaMock.complaint.update.mockRejectedValue(new Error('db down'));

      await expect(
        service.update('complaint-1', { title: 'x' } as any, userId),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('remove', () => {
    it('deleta a denúncia do próprio dono', async () => {
      prismaMock.complaint.findUnique.mockResolvedValue(complaint);
      prismaMock.complaint.delete.mockResolvedValue(complaint);

      await expect(service.remove('complaint-1', userId)).resolves.toEqual(
        complaint,
      );
      expect(prismaMock.complaint.delete).toHaveBeenCalledWith({
        where: { id: 'complaint-1' },
      });
    });

    it('lança NotFoundException quando a denúncia não existe', async () => {
      prismaMock.complaint.findUnique.mockResolvedValue(null);

      await expect(service.remove('inexistente', userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.complaint.delete).not.toHaveBeenCalled();
    });

    it('lança UnauthorizedException quando a denúncia é de outro usuário', async () => {
      prismaMock.complaint.findUnique.mockResolvedValue(
        makeComplaint('complaint-1', 'outro'),
      );

      await expect(service.remove('complaint-1', userId)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prismaMock.complaint.delete).not.toHaveBeenCalled();
    });

    it('lança InternalServerErrorException em falha do banco', async () => {
      prismaMock.complaint.findUnique.mockResolvedValue(complaint);
      prismaMock.complaint.delete.mockRejectedValue(new Error('db down'));

      await expect(service.remove('complaint-1', userId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
