import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { FriendshipStatus, Prisma } from '@prisma/client';
import { UserService } from './user.service';
import { PrismaService } from '../database/prisma.service';
import { HashService } from '../../common/hash/hash.service';
import { prismaMock, resetPrismaMock } from '../../../test/prisma.mock';

const knownError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('erro', {
    code,
    clientVersion: '7.3.0',
  });

describe('UserService', () => {
  let service: UserService;
  let hashService: { hashPassword: jest.Mock; comparePassword: jest.Mock };

  const userId = 'user-1';
  const publicUser = { id: userId, name: 'Ana', email: 'ana@mail.com' };
  const fullUser = { ...publicUser, password: 'hashed' };

  // Contagens cruas do Prisma: amizade é uma linha só, e o usuário pode estar
  // em qualquer um dos dois lados dela.
  const rawCount = {
    posts: 2,
    complaints: 1,
    articles: 3,
    sentRequests: 2,
    receivedRequests: 3,
  };

  const countSelect = {
    select: {
      posts: true,
      complaints: true,
      articles: true,
      sentRequests: { where: { status: FriendshipStatus.ACCEPTED } },
      receivedRequests: { where: { status: FriendshipStatus.ACCEPTED } },
    },
  };

  beforeEach(async () => {
    resetPrismaMock();
    hashService = {
      hashPassword: jest.fn().mockResolvedValue('hashed'),
      comparePassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: HashService, useValue: hashService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('faz hash da senha e cria o usuário sem devolver a senha', async () => {
      prismaMock.user.create.mockResolvedValue(publicUser);

      const result = await service.create({
        name: 'Ana',
        email: 'ana@mail.com',
        password: 'senha123',
      } as Prisma.UserCreateInput);

      expect(hashService.hashPassword).toHaveBeenCalledWith('senha123');
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: { name: 'Ana', email: 'ana@mail.com', password: 'hashed' },
        select: { id: true, name: true, email: true },
      });
      expect(result).toEqual(publicUser);
      expect(result).not.toHaveProperty('password');
    });

    it('lança ConflictException quando o e-mail já existe (P2002)', async () => {
      prismaMock.user.create.mockRejectedValue(knownError('P2002'));

      await expect(
        service.create({
          name: 'Ana',
          email: 'ana@mail.com',
          password: 'senha123',
        } as Prisma.UserCreateInput),
      ).rejects.toThrow(ConflictException);
    });

    it('lança InternalServerErrorException em erro genérico', async () => {
      prismaMock.user.create.mockRejectedValue(new Error('db down'));

      await expect(
        service.create({
          name: 'Ana',
          email: 'ana@mail.com',
          password: 'senha123',
        } as Prisma.UserCreateInput),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findOneWithPassword', () => {
    it('retorna o usuário completo, incluindo a senha', async () => {
      prismaMock.user.findUnique.mockResolvedValue(fullUser);

      const result = await service.findOneWithPassword({
        email: 'ana@mail.com',
      });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'ana@mail.com' },
      });
      expect(result).toEqual(fullUser);
    });

    it('lança UnauthorizedException quando não encontra o usuário', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.findOneWithPassword({ email: 'nao@existe.com' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lança InternalServerErrorException em falha do banco', async () => {
      prismaMock.user.findUnique.mockRejectedValue(new Error('db down'));

      await expect(
        service.findOneWithPassword({ email: 'ana@mail.com' }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findOne', () => {
    it('retorna o usuário sem a senha e com as contagens do perfil', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...publicUser,
        _count: rawCount,
      });

      const result = await service.findOne({ id: userId });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { id: true, name: true, email: true, _count: countSelect },
      });
      expect(result).toEqual({
        ...publicUser,
        _count: { posts: 2, complaints: 1, articles: 3, friends: 5 },
      });
      expect(result).not.toHaveProperty('password');
    });

    it('soma os dois lados da amizade na contagem de amigos', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...publicUser,
        _count: { ...rawCount, sentRequests: 0, receivedRequests: 4 },
      });

      const result = await service.findOne({ id: userId });

      expect(result._count.friends).toBe(4);
    });

    it('lança NotFoundException quando o usuário não existe', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne({ id: 'inexistente' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lança InternalServerErrorException em falha do banco', async () => {
      prismaMock.user.findUnique.mockRejectedValue(new Error('db down'));

      await expect(service.findOne({ id: userId })).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('update', () => {
    it('atualiza o nome do próprio usuário', async () => {
      prismaMock.user.update.mockResolvedValue({ ...publicUser, name: 'Bia' });

      const result = await service.update(userId, { name: 'Bia' }, userId);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { name: 'Bia' },
        select: { id: true, name: true, email: true },
      });
      expect(result.name).toBe('Bia');
    });

    it('bloqueia atualização de outro usuário', async () => {
      await expect(
        service.update(userId, { name: 'Bia' }, 'outro-user'),
      ).rejects.toThrow(UnauthorizedException);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('lança ConflictException em violação de unicidade (P2002)', async () => {
      prismaMock.user.update.mockRejectedValue(knownError('P2002'));

      await expect(
        service.update(userId, { name: 'Bia' }, userId),
      ).rejects.toThrow(ConflictException);
    });

    it('lança InternalServerErrorException em erro genérico', async () => {
      prismaMock.user.update.mockRejectedValue(new Error('db down'));

      await expect(
        service.update(userId, { name: 'Bia' }, userId),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('remove', () => {
    it('deleta o próprio usuário', async () => {
      prismaMock.user.delete.mockResolvedValue(publicUser);

      const result = await service.remove(userId, userId);

      expect(prismaMock.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      });
      expect(result).toEqual(publicUser);
    });

    it('bloqueia exclusão de outro usuário', async () => {
      await expect(service.remove(userId, 'outro-user')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prismaMock.user.delete).not.toHaveBeenCalled();
    });

    it('lança InternalServerErrorException em falha do banco', async () => {
      prismaMock.user.delete.mockRejectedValue(new Error('db down'));

      await expect(service.remove(userId, userId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
