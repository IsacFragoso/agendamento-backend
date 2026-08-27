import { UnauthorizedException } from '@nestjs/common';
import * as bcryptjs from 'bcryptjs';
import { AuthService } from '../../src/modules/auth/auth.service';

describe('AuthService', () => {
  it('returns token and user on successful login', async () => {
    const dto = { email: 'test@example.com', senha: 'plain' } as any;

    const fakeUser = {
      id_usuario: 42,
      nome_completo: 'Test User',
      email: 'test@example.com',
      telefone: '123',
      data_nascimento: new Date('1990-01-01'),
      tipo_conta: 'CLIENTE',
      ativo: true,
      senha_hash: await bcryptjs.hash('plain', 1),
    } as any;

    const usuariosRepo = { findOne: jest.fn().mockResolvedValue(fakeUser) } as any;
    const jwtService = { sign: jest.fn().mockReturnValue('signed-token') } as any;
    const revokedRepo = {} as any;

    const svc = new AuthService(usuariosRepo, jwtService, revokedRepo);

    const res = await svc.login(dto);
    expect(res).toHaveProperty('access_token', 'signed-token');
    expect(res.usuario).toMatchObject({ id_usuario: 42, email: 'test@example.com' });
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 42, email: 'test@example.com' }),
    );
  });

  it('throws UnauthorizedException for wrong credentials', async () => {
    const dto = { email: 'x@example.com', senha: 'wrong' } as any;
    const usuariosRepo = { findOne: jest.fn().mockResolvedValue(null) } as any;
    const jwtService = { sign: jest.fn() } as any;
    const revokedRepo = {} as any;

    const svc = new AuthService(usuariosRepo, jwtService, revokedRepo);

    await expect(svc.login(dto)).rejects.toThrow(UnauthorizedException);
  });
});
