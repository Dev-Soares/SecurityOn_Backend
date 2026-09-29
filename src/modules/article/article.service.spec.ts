import { Test, TestingModule } from '@nestjs/testing';
import {
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ArticleService } from './article.service';
import { PrismaService } from '../database/prisma.service';
import { prismaMock, resetPrismaMock } from '../../../test/prisma.mock';

const makeArticle = (id: string, userId = 'user-1') => ({
  id,
  bgUrl: null,
  title: `titulo ${id}`,
  content: `conteudo ${id}`,
  userId,
  createdAt: new Date('2026-01-01T00:00:00Z'),
});

describe('ArticleService', () => {
  let service: ArticleService;

  const userId = 'user-1';
  const article = makeArticle('article-1');

  beforeEach(async () => {
    resetPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ArticleService>(ArticleService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('cria o artigo vinculado ao usuário autenticado', async () => {
      prismaMock.article.create.mockResolvedValue(article);

      const dto = {
        title: 'titulo article-1',
        content: 'conteudo article-1',
        bgUrl: 'https://img.com/bg.png',
      };

      const result = await service.create(dto as any, userId);

      expect(prismaMock.article.create).toHaveBeenCalledWith({
        data: {
          title: dto.title,
          content: dto.content,
          bgUrl: dto.bgUrl,
          userId,
        },
      });
      expect(result).toEqual(article);
    });

    it('lança InternalServerErrorException em falha do banco', async () => {
      prismaMock.article.create.mockRejectedValue(new Error('db down'));

      await expect(
        service.create({ title: 't', content: 'c' } as any, userId),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findAll', () => {
    it('usa limite padrão de 10 e busca take + 1 registros', async () => {
      prismaMock.article.findMany.mockResolvedValue([article]);

      const result = await service.findAll({});

      expect(prismaMock.article.findMany).toHaveBeenCalledWith({
        take: 11,
        cursor: undefined,
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.data).toEqual([article]);
      expect(result.hasNextPage).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('aplica o cursor e pula o registro do cursor', async () => {
      prismaMock.article.findMany.mockResolvedValue([article]);

      await service.findAll({ cursor: 'article-0', limit: '5' });

      expect(prismaMock.article.findMany).toHaveBeenCalledWith({
        take: 6,
        cursor: { id: 'article-0' },
        skip: 1,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('descarta o registro extra e devolve nextCursor quando há próxima página', async () => {
      const articles = Array.from({ length: 3 }, (_, i) =>
        makeArticle(`article-${i}`),
      );
      prismaMock.article.findMany.mockResolvedValue(articles);

      const result = await service.findAll({ limit: '2' });

      expect(result.data).toHaveLength(2);
      expect(result.hasNextPage).toBe(true);
      expect(result.nextCursor).toBe('article-1');
    });

    it('rejeita limite maior ou igual a 100', async () => {
      await expect(service.findAll({ limit: '100' })).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(prismaMock.article.findMany).not.toHaveBeenCalled();
    });

    it('lança InternalServerErrorException em falha do banco', async () => {
      prismaMock.article.findMany.mockRejectedValue(new Error('db down'));

      await expect(service.findAll({})).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findByUser', () => {
    it('filtra os artigos pelo userId informado', async () => {
      prismaMock.article.findMany.mockResolvedValue([article]);

      const result = await service.findByUser({ limit: '5' }, userId);

      expect(prismaMock.article.findMany).toHaveBeenCalledWith({
        take: 6,
        cursor: undefined,
        skip: 0,
        orderBy: { createdAt: 'desc' },
        where: { userId },
      });
      expect(result.data).toEqual([article]);
    });

    it('rejeita limite maior ou igual a 100', async () => {
      await expect(
        service.findByUser({ limit: '150' }, userId),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('lança InternalServerErrorException em falha do banco', async () => {
      prismaMock.article.findMany.mockRejectedValue(new Error('db down'));

      await expect(service.findByUser({}, userId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findOne', () => {
    it('retorna o artigo encontrado', async () => {
      prismaMock.article.findUnique.mockResolvedValue(article);

      await expect(service.findOne('article-1')).resolves.toEqual(article);
      expect(prismaMock.article.findUnique).toHaveBeenCalledWith({
        where: { id: 'article-1' },
      });
    });

    it('lança NotFoundException quando o artigo não existe', async () => {
      prismaMock.article.findUnique.mockResolvedValue(null);

      await expect(service.findOne('inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lança InternalServerErrorException em falha do banco', async () => {
      prismaMock.article.findUnique.mockRejectedValue(new Error('db down'));

      await expect(service.findOne('article-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('update', () => {
    it('atualiza o artigo do próprio dono', async () => {
      prismaMock.article.findUnique.mockResolvedValue(article);
      prismaMock.article.update.mockResolvedValue({
        ...article,
        title: 'novo',
      });

      const dto = {
        title: 'novo',
        content: 'novo conteudo',
        bgUrl: 'https://img.com/novo.png',
      };

      const result = await service.update('article-1', dto as any, userId);

      expect(prismaMock.article.update).toHaveBeenCalledWith({
        where: { id: 'article-1' },
        data: dto,
      });
      expect(result.title).toBe('novo');
    });

    it('lança NotFoundException quando o artigo não existe', async () => {
      prismaMock.article.findUnique.mockResolvedValue(null);

      await expect(
        service.update('inexistente', { title: 'x' } as any, userId),
      ).rejects.toThrow(NotFoundException);
      expect(prismaMock.article.update).not.toHaveBeenCalled();
    });

    it('lança UnauthorizedException quando o artigo é de outro usuário', async () => {
      prismaMock.article.findUnique.mockResolvedValue(
        makeArticle('article-1', 'outro'),
      );

      await expect(
        service.update('article-1', { title: 'x' } as any, userId),
      ).rejects.toThrow(UnauthorizedException);
      expect(prismaMock.article.update).not.toHaveBeenCalled();
    });

    it('lança InternalServerErrorException em falha do banco', async () => {
      prismaMock.article.findUnique.mockResolvedValue(article);
      prismaMock.article.update.mockRejectedValue(new Error('db down'));

      await expect(
        service.update('article-1', { title: 'x' } as any, userId),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('remove', () => {
    it('deleta o artigo do próprio dono', async () => {
      prismaMock.article.findUnique.mockResolvedValue(article);
      prismaMock.article.delete.mockResolvedValue(article);

      await expect(service.remove('article-1', userId)).resolves.toEqual(
        article,
      );
      expect(prismaMock.article.delete).toHaveBeenCalledWith({
        where: { id: 'article-1' },
      });
    });

    it('lança NotFoundException quando o artigo não existe', async () => {
      prismaMock.article.findUnique.mockResolvedValue(null);

      await expect(service.remove('inexistente', userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.article.delete).not.toHaveBeenCalled();
    });

    it('lança UnauthorizedException quando o artigo é de outro usuário', async () => {
      prismaMock.article.findUnique.mockResolvedValue(
        makeArticle('article-1', 'outro'),
      );

      await expect(service.remove('article-1', userId)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prismaMock.article.delete).not.toHaveBeenCalled();
    });

    it('lança InternalServerErrorException em falha do banco', async () => {
      prismaMock.article.findUnique.mockResolvedValue(article);
      prismaMock.article.delete.mockRejectedValue(new Error('db down'));

      await expect(service.remove('article-1', userId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
