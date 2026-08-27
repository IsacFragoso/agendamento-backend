import request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AuthController } from '../../src/modules/auth/auth.controller';
import { AuthService } from '../../src/modules/auth/auth.service';

describe('Auth API', () => {
  let app: INestApplication;
  const authService = {
    login: jest.fn(),
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
});
