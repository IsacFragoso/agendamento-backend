import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcryptjs from 'bcryptjs';
import { createHash } from 'crypto';
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
    expect(usuariosRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ senha_hash: true }),
      }),
    );
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

  it('blocks login until the email has been verified', async () => {
    const dto = { email: 'test@example.com', senha: 'plain' } as any;
    const fakeUser = {
      id_usuario: 42,
      email: 'test@example.com',
      tipo_conta: 'CLIENTE',
      deleted_at: null,
      email_verified_at: null,
      senha_hash: await bcryptjs.hash('plain', 1),
    } as any;
    const usuariosRepo = { findOne: jest.fn().mockResolvedValue(fakeUser) } as any;
    const svc = new AuthService(usuariosRepo, { sign: jest.fn() } as any, {} as any);

    await expect(svc.login(dto)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([
    { email_count: '3', ip_count: '0', last_email_request: null },
    { email_count: '0', ip_count: '10', last_email_request: null },
    { email_count: '1', ip_count: '1', last_email_request: new Date() },
  ])('does not send a verification link when a resend limit is reached', async (counts) => {
    const manager = {
      query: jest
        .fn()
        .mockImplementation((sql: string) => (sql.includes('COUNT(*) FILTER') ? [counts] : [])),
    };
    const usuariosRepo = {
      findOne: jest.fn(),
      manager: { transaction: jest.fn((callback) => callback(manager)) },
    } as any;
    const config = {
      get: jest.fn((key: string) => (key === 'JWT_SECRET' ? 'test-secret' : undefined)),
    };
    const svc = new AuthService(usuariosRepo, {} as any, {} as any, undefined, config as any);

    const response = await svc.requestEmailVerification(
      { email: 'alice@example.com' },
      '127.0.0.1',
    );

    expect(response.message).toContain('Se houver uma conta pendente');
    expect(usuariosRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ email: 'alice@example.com' }) }),
    );
    expect(manager.query).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO "email_verification_attempt"'),
      expect.anything(),
    );
  });

  it('uses the same response for an email that has no pending account', async () => {
    const manager = {
      query: jest
        .fn()
        .mockImplementation((sql: string) =>
          sql.includes('COUNT(*) FILTER')
            ? [{ email_count: '0', ip_count: '0', last_email_request: null }]
            : [],
        ),
    };
    const usuariosRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      manager: { transaction: jest.fn((callback) => callback(manager)) },
    } as any;
    const config = {
      get: jest.fn((key: string) => (key === 'JWT_SECRET' ? 'test-secret' : undefined)),
    };
    const svc = new AuthService(usuariosRepo, {} as any, {} as any, undefined, config as any);

    const response = await svc.requestEmailVerification(
      { email: 'unknown@example.com' },
      '127.0.0.1',
    );

    expect(response.message).toContain('Se houver uma conta pendente');
    expect(usuariosRepo.findOne).toHaveBeenCalledWith({
      where: { email: 'unknown@example.com', deleted_at: expect.anything() },
    });
  });

  it('rejects a verification link for an account older than the retention period', async () => {
    const token = 'a'.repeat(64);
    const usuario = {
      id_usuario: 1,
      email_verified_at: null,
      email_verification_expires_at: new Date(Date.now() + 60_000),
      data_cadastro: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    };
    const usuariosRepo = {
      findOne: jest.fn().mockResolvedValue(usuario),
      save: jest.fn(),
    } as any;
    const svc = new AuthService(usuariosRepo, {} as any, {} as any);

    await expect(svc.verifyEmail({ token })).rejects.toBeInstanceOf(BadRequestException);
    expect(usuariosRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          email_verification_token_hash: createHash('sha256').update(token).digest('hex'),
        }),
        select: expect.objectContaining({ data_cadastro: true }),
      }),
    );
    expect(usuariosRepo.save).not.toHaveBeenCalled();
  });

  it('cleans up only expired, unverified client accounts without related records', async () => {
    const manager = {
      query: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id_usuario: 9 }]),
    };
    const usuariosRepo = { manager } as any;
    const svc = new AuthService(usuariosRepo, {} as any, {} as any);

    await expect(svc.cleanupExpiredUnverifiedAccounts()).resolves.toBe(1);

    expect(manager.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(`usuario."data_cadastro" < now() - INTERVAL '14 days'`),
    );
    const cleanupQuery = manager.query.mock.calls[1][0];
    expect(cleanupQuery).toContain('usuario."email_verified_at" IS NULL');
    expect(cleanupQuery).toContain('FROM "agendamento"');
    expect(cleanupQuery).toContain('FROM "sugestao_prestador"');
    expect(cleanupQuery).toContain('FROM "perfil_prestador"');
  });

  it('renders the verification template with the project name and escaped confirmation URL', () => {
    const svc = new AuthService({} as any, {} as any, {} as any);
    const html = (svc as any).renderVerificationEmail(
      'http://localhost:5173/verificar-email?token=abc&source=test',
    );

    expect(html).toContain('SAPNE');
    expect(html).toContain('fill="none" stroke="#ffffff"');
    expect(html).toContain(
      'href="http://localhost:5173/verificar-email?token=abc&amp;source=test"',
    );
    expect(html).not.toContain('{{verificationUrl}}');
    expect(html).not.toContain('{{appName}}');
  });

  it('renders the password reset template with the project name and escaped reset URL', () => {
    const svc = new AuthService({} as any, {} as any, {} as any);
    const html = (svc as any).renderPasswordResetEmail(
      'http://localhost:5173/recuperar-senha?token=abc&source=test',
    );

    expect(html).toContain('Redefina sua senha');
    expect(html).toContain('SAPNE');
    expect(html).toContain('href="http://localhost:5173/recuperar-senha?token=abc&amp;source=test"');
    expect(html).not.toContain('{{resetUrl}}');
    expect(html).not.toContain('{{appName}}');
  });
});
