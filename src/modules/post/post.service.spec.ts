import { Test, TestingModule } from '@nestjs/testing';
import {
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PostService } from './post.service';
import { PrismaService } from '../database/prisma.service';
import { postReadInclude } from './post.mapper';
import { prismaMock, resetPrismaMock } from '../../../test/prisma.mock';

const makePost = (id: string, userId = 'user-1') => ({
  id,
  content: `conteudo ${id}`,
  userId,
  imgUrl: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
});

// Linha como o Prisma devolve nas rotas de leitura: autor e contagens vêm junto,
// e a relação likes só existe quando a requisição é autenticada.
const makeRow = (
  id: string,
  userId = 'user-1',
  extra: { likes?: { id: string }[]; counts?: { likes: number; comments: number } } = {},
) => ({
  ...makePost(id, userId),
  user: { id: userId, name: 'Ana' },
  _count: extra.counts ?? { likes: 0, comments: 0 },
  ...(extra.likes ? { likes: extra.likes } : {}),
});

describe('PostService', () => {
  let service: PostService;

  const userId = 'user-1';
  const post = makePost('post-1');
  const row = makeRow('post-1');

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
      prismaMock.post.findMany.mockResolvedValue([row]);

      const result = await service.findAll({}, null);

      expect(prismaMock.post.findMany).toHaveBeenCalledWith({
        take: 11,
        cursor: undefined,
        skip: 0,
        orderBy: { createdAt: 'desc' },
        include: postReadInclude(null),
      });
      expect(result.data).toEqual([{ ...row, liked: false }]);
      expect(result.hasNextPage).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('aplica o cursor e pula o registro do cursor', async () => {
      prismaMock.post.findMany.mockResolvedValue([row]);

      await service.findAll({ cursor: 'post-0', limit: '5' }, null);

      expect(prismaMock.post.findMany).toHaveBeenCalledWith({
        take: 6,
        cursor: { id: 'post-0' },
        skip: 1,
        orderBy: { createdAt: 'desc' },
        include: postReadInclude(null),
      });
    });

    it('descarta o registro extra e devolve nextCursor quando há próxima página', async () => {
      const posts = Array.from({ length: 3 }, (_, i) => makeRow(`post-${i}`));
      prismaMock.post.findMany.mockResolvedValue(posts);

      const result = await service.findAll({ limit: '2' }, null);

      expect(result.data).toHaveLength(2);
      expect(result.hasNextPage).toBe(true);
      expect(result.nextCursor).toBe('post-1');
    });

    it('para usuário anônimo não filtra likes e devolve liked falso', async () => {
      prismaMock.post.findMany.mockResolvedValue([row]);

      const result = await service.findAll({}, null);

      expect(prismaMock.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.not.objectContaining({ likes: expect.anything() }),
        }),
      );
      expect(result.data[0].liked).toBe(false);
    });

    it('para usuário autenticado filtra likes por ele e achata em liked', async () => {
      prismaMock.post.findMany.mockResolvedValue([
        makeRow('post-1', 'outro', { likes: [{ id: 'like-1' }] }),
      ]);

      const result = await service.findAll({}, userId);

      expect(prismaMock.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            likes: { where: { userId }, select: { id: true }, take: 1 },
          }),
        }),
      );
      expect(result.data[0].liked).toBe(true);
      expect(result.data[0]).not.toHaveProperty('likes');
    });

    it('rejeita limite maior ou igual a 100', async () => {
      await expect(service.findAll({ limit: '100' }, null)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(prismaMock.post.findMany).not.toHaveBeenCalled();
    });

    it('lança InternalServerErrorException em falha do banco', async () => {
      prismaMock.post.findMany.mockRejectedValue(new Error('db down'));

      await expect(service.findAll({}, null)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findByUser', () => {
    it('filtra os posts pelo userId informado', async () => {
      prismaMock.post.findMany.mockResolvedValue([row]);

      const result = await service.findByUser({ limit: '5' }, userId, null);

      expect(prismaMock.post.findMany).toHaveBeenCalledWith({
        take: 6,
        cursor: undefined,
        skip: 0,
        orderBy: { createdAt: 'desc' },
        where: { userId },
        include: postReadInclude(null),
      });
      expect(result.data).toEqual([{ ...row, liked: false }]);
    });

    it('separa o dono do feed do usuário logado ao montar o include', async () => {
      prismaMock.post.findMany.mockResolvedValue([
        makeRow('post-1', 'dono', { likes: [{ id: 'like-1' }] }),
      ]);

      const result = await service.findByUser({}, 'dono', userId);

      expect(prismaMock.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'dono' },
          include: expect.objectContaining({
            likes: { where: { userId }, select: { id: true }, take: 1 },
          }),
        }),
      );
      expect(result.data[0].liked).toBe(true);
    });

    it('rejeita limite maior ou igual a 100', async () => {
      await expect(
        service.findByUser({ limit: '150' }, userId, null),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('lança InternalServerErrorException em falha do banco', async () => {
      prismaMock.post.findMany.mockRejectedValue(new Error('db down'));

      await expect(service.findByUser({}, userId, null)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findOne', () => {
    it('retorna o post encontrado com autor, contagens e liked', async () => {
      prismaMock.post.findUnique.mockResolvedValue(
        makeRow('post-1', userId, { counts: { likes: 3, comments: 2 } }),
      );

      const result = await service.findOne('post-1', null);

      expect(prismaMock.post.findUnique).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        include: postReadInclude(null),
      });
      expect(result.user).toEqual({ id: userId, name: 'Ana' });
      expect(result._count).toEqual({ likes: 3, comments: 2 });
      expect(result.liked).toBe(false);
    });

    it('lança NotFoundException quando o post não existe', async () => {
      prismaMock.post.findUnique.mockResolvedValue(null);

      await expect(service.findOne('inexistente', null)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lança InternalServerErrorException em falha do banco', async () => {
      prismaMock.post.findUnique.mockRejectedValue(new Error('db down'));

      await expect(service.findOne('post-1', null)).rejects.toThrow(
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
