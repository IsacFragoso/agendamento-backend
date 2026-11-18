import request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AuthController } from '../../src/modules/auth/auth.controller';
import { AuthService } from '../../src/modules/auth/auth.service';

describe('Auth API', () => {
  let app: INestApplication;
  const authService = {
    login: jest.fn(),
    verifyEmail: jest.fn(),
    requestEmailVerification: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    authService.login.mockReset();
    authService.verifyEmail.mockReset();
    authService.requestEmailVerification.mockReset();
    authService.login.mockResolvedValue({
      access_token: 'signed-token',
      usuario: {
        id_usuario: 9,
        nome_completo: 'Alice Cliente',
        email: 'alice@example.com',
        telefone: '11999999999',
        data_nascimento: '1990-01-01',
        tipo_conta: 'CLIENTE',
        ativo: true,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs in with valid credentials', async () => {
    const payload = { email: 'alice@example.com', senha: 'secret' };

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(payload)
      .expect(201);

    expect(authService.login).toHaveBeenCalledWith(payload);
    expect(response.body).toEqual({
      access_token: 'signed-token',
      usuario: {
        id_usuario: 9,
        nome_completo: 'Alice Cliente',
        email: 'alice@example.com',
        telefone: '11999999999',
        data_nascimento: '1990-01-01',
        tipo_conta: 'CLIENTE',
        ativo: true,
      },
    });
  });

  it('verifies an email with a confirmation token', async () => {
    authService.verifyEmail.mockResolvedValue({
      message: 'E-mail confirmado com sucesso. Faça login para continuar.',
    });
    const response = await request(app.getHttpServer())
      .post('/auth/verificar-email')
      .send({ token: 'a'.repeat(64) })
      .expect(201);

    expect(authService.verifyEmail).toHaveBeenCalledWith({ token: 'a'.repeat(64) });
    expect(response.body.message).toContain('confirmado');
  });

  it('accepts a request to resend email verification', async () => {
    authService.requestEmailVerification.mockResolvedValue({
      message: 'Se houver uma conta pendente para esse e-mail, você receberá um novo link.',
    });
    await request(app.getHttpServer())
      .post('/auth/reenviar-verificacao')
      .send({ email: 'alice@example.com' })
      .expect(201);

    expect(authService.requestEmailVerification).toHaveBeenCalledWith(
      {
        email: 'alice@example.com',
      },
      expect.any(String),
    );
  });
});
