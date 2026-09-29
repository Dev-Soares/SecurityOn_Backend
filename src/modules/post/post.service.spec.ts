import { Test, TestingModule } from '@nestjs/testing';
import {
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PostService } from './post.service';
import { PrismaService } from '../database/prisma.service';
import { prismaMock, resetPrismaMock } from '../../../test/prisma.mock';

const makePost = (id: string, userId = 'user-1') => ({
  id,
  content: `conteudo ${id}`,
  userId,
  imgUrl: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
});

describe('PostService', () => {
  let service: PostService;

  const userId = 'user-1';
  const post = makePost('post-1');

  beforeEach(async () => {
    resetPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [PostService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get<PostService>(PostService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('cria o post vinculado ao usuário autenticado', async () => {
      prismaMock.post.create.mockResolvedValue(post);

      const result = await service.create(
        { content: 'conteudo post-1', imgUrl: undefined } as any,
        userId,
      );

      expect(prismaMock.post.create).toHaveBeenCalledWith({
        data: { content: 'conteudo post-1', userId, imgUrl: undefined },
      });
      expect(result).toEqual(post);
    });

    it('lança InternalServerErrorException em falha do banco', async () => {
      prismaMock.post.create.mockRejectedValue(new Error('db down'));

      await expect(
        service.create({ content: 'x' } as any, userId),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findAll', () => {
    it('usa limite padrão de 10 e busca take + 1 registros', async () => {
      prismaMock.post.findMany.mockResolvedValue([post]);

      const result = await service.findAll({});

      expect(prismaMock.post.findMany).toHaveBeenCalledWith({
        take: 11,
        cursor: undefined,
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.data).toEqual([post]);
      expect(result.hasNextPage).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('aplica o cursor e pula o registro do cursor', async () => {
      prismaMock.post.findMany.mockResolvedValue([post]);

      await service.findAll({ cursor: 'post-0', limit: '5' });

      expect(prismaMock.post.findMany).toHaveBeenCalledWith({
        take: 6,
        cursor: { id: 'post-0' },
        skip: 1,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('descarta o registro extra e devolve nextCursor quando há próxima página', async () => {
      const posts = Array.from({ length: 3 }, (_, i) => makePost(`post-${i}`));
      prismaMock.post.findMany.mockResolvedValue(posts);

      const result = await service.findAll({ limit: '2' });

      expect(result.data).toHaveLength(2);
      expect(result.hasNextPage).toBe(true);
      expect(result.nextCursor).toBe('post-1');
    });

    it('rejeita limite maior ou igual a 100', async () => {
      await expect(service.findAll({ limit: '100' })).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(prismaMock.post.findMany).not.toHaveBeenCalled();
    });

    it('lança InternalServerErrorException em falha do banco', async () => {
      prismaMock.post.findMany.mockRejectedValue(new Error('db down'));

      await expect(service.findAll({})).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findByUser', () => {
    it('filtra os posts pelo userId informado', async () => {
      prismaMock.post.findMany.mockResolvedValue([post]);

      const result = await service.findByUser({ limit: '5' }, userId);

      expect(prismaMock.post.findMany).toHaveBeenCalledWith({
        take: 6,
        cursor: undefined,
        skip: 0,
        orderBy: { createdAt: 'desc' },
        where: { userId },
      });
      expect(result.data).toEqual([post]);
    });

    it('rejeita limite maior ou igual a 100', async () => {
      await expect(
        service.findByUser({ limit: '150' }, userId),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('lança InternalServerErrorException em falha do banco', async () => {
      prismaMock.post.findMany.mockRejectedValue(new Error('db down'));

      await expect(service.findByUser({}, userId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findOne', () => {
    it('retorna o post encontrado', async () => {
      prismaMock.post.findUnique.mockResolvedValue(post);

      await expect(service.findOne('post-1')).resolves.toEqual(post);
      expect(prismaMock.post.findUnique).toHaveBeenCalledWith({
        where: { id: 'post-1' },
      });
    });

    it('lança NotFoundException quando o post não existe', async () => {
      prismaMock.post.findUnique.mockResolvedValue(null);

      await expect(service.findOne('inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lança InternalServerErrorException em falha do banco', async () => {
      prismaMock.post.findUnique.mockRejectedValue(new Error('db down'));

      await expect(service.findOne('post-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('update', () => {
    it('atualiza o post do próprio dono', async () => {
      prismaMock.post.findUnique.mockResolvedValue(post);
      prismaMock.post.update.mockResolvedValue({ ...post, content: 'novo' });

      const result = await service.update(
        'post-1',
        { content: 'novo', imgUrl: 'url' } as any,
        userId,
      );

      expect(prismaMock.post.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { content: 'novo', imgUrl: 'url' },
      });
      expect(result.content).toBe('novo');
    });

    it('lança NotFoundException quando o post não existe', async () => {
      prismaMock.post.findUnique.mockResolvedValue(null);

      await expect(
        service.update('inexistente', { content: 'x' } as any, userId),
      ).rejects.toThrow(NotFoundException);
      expect(prismaMock.post.update).not.toHaveBeenCalled();
    });

    it('lança UnauthorizedException quando o post é de outro usuário', async () => {
      prismaMock.post.findUnique.mockResolvedValue(makePost('post-1', 'outro'));

      await expect(
        service.update('post-1', { content: 'x' } as any, userId),
      ).rejects.toThrow(UnauthorizedException);
      expect(prismaMock.post.update).not.toHaveBeenCalled();
    });

    it('lança InternalServerErrorException em falha do banco', async () => {
      prismaMock.post.findUnique.mockResolvedValue(post);
      prismaMock.post.update.mockRejectedValue(new Error('db down'));

      await expect(
        service.update('post-1', { content: 'x' } as any, userId),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('remove', () => {
    it('deleta o post do próprio dono', async () => {
      prismaMock.post.findUnique.mockResolvedValue(post);
      prismaMock.post.delete.mockResolvedValue(post);

      await expect(service.remove('post-1', userId)).resolves.toEqual(post);
      expect(prismaMock.post.delete).toHaveBeenCalledWith({
        where: { id: 'post-1' },
      });
    });

    it('lança NotFoundException quando o post não existe', async () => {
      prismaMock.post.findUnique.mockResolvedValue(null);

      await expect(service.remove('inexistente', userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.post.delete).not.toHaveBeenCalled();
    });

    it('lança UnauthorizedException quando o post é de outro usuário', async () => {
      prismaMock.post.findUnique.mockResolvedValue(makePost('post-1', 'outro'));

      await expect(service.remove('post-1', userId)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prismaMock.post.delete).not.toHaveBeenCalled();
    });

    it('converte P2025 do Prisma em NotFoundException', async () => {
      prismaMock.post.findUnique.mockResolvedValue(post);
      prismaMock.post.delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('nao encontrado', {
          code: 'P2025',
          clientVersion: '7.3.0',
        }),
      );

      await expect(service.remove('post-1', userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lança InternalServerErrorException em falha genérica', async () => {
      prismaMock.post.findUnique.mockResolvedValue(post);
      prismaMock.post.delete.mockRejectedValue(new Error('db down'));

      await expect(service.remove('post-1', userId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
