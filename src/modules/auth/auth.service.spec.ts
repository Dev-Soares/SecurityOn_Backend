import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { HashService } from '../../common/hash/hash.service';

describe('AuthService', () => {
  let service: AuthService;
  let userService: { findOneWithPassword: jest.Mock };
  let hashService: { comparePassword: jest.Mock };
  let jwtService: { signAsync: jest.Mock };

  const user = {
    id: 'user-1',
    name: 'Ana',
    email: 'ana@mail.com',
    password: 'hashed',
  };

  beforeEach(async () => {
    userService = { findOneWithPassword: jest.fn().mockResolvedValue(user) };
    hashService = { comparePassword: jest.fn().mockResolvedValue(true) };
    jwtService = { signAsync: jest.fn().mockResolvedValue('jwt-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userService },
        { provide: HashService, useValue: hashService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('signIn', () => {
    it('retorna o token quando as credenciais são válidas', async () => {
      const result = await service.signIn('ana@mail.com', 'senha123');

      expect(userService.findOneWithPassword).toHaveBeenCalledWith({
        email: 'ana@mail.com',
      });
      expect(hashService.comparePassword).toHaveBeenCalledWith(
        'senha123',
        'hashed',
      );
      expect(result).toEqual({ access_token: 'jwt-token' });
    });

    it('assina o token com sub e name do usuário', async () => {
      await service.signIn('ana@mail.com', 'senha123');

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: user.id,
        name: user.name,
      });
    });

    it('lança UnauthorizedException quando a senha não confere', async () => {
      hashService.comparePassword.mockResolvedValue(false);

      await expect(
        service.signIn('ana@mail.com', 'senha-errada'),
      ).rejects.toThrow(UnauthorizedException);
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('propaga o erro quando o usuário não existe', async () => {
      userService.findOneWithPassword.mockRejectedValue(
        new UnauthorizedException('Email ou senha inválidos'),
      );

      await expect(
        service.signIn('nao@existe.com', 'senha123'),
      ).rejects.toThrow(UnauthorizedException);
      expect(hashService.comparePassword).not.toHaveBeenCalled();
    });
  });
});
