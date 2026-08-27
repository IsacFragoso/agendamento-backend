import request from 'supertest';
import { createTestApp } from '../support/test-app';

describe('Users API', () => {
  let context: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => {
    context = await createTestApp();
  });

  afterAll(() => context.app.close());
  beforeEach(() => context.reset());

  it('creates users through public registration', async () => {
    await request(context.app.getHttpServer())
      .post('/usuarios')
      .send({
        nome_completo: 'Client',
        email: 'client@example.com',
        tipo_conta: 'CLIENTE',
        senha: 'password',
      })
      .expect(201);
    expect(context.usersService.create).toHaveBeenCalled();
  });

  it('rejects protected routes without authentication', async () => {
    context.setAuthenticated(false);
    await request(context.app.getHttpServer()).get('/usuarios/7').expect(401);
  });

  it('forwards the requester identity when viewing a user', async () => {
    await request(context.app.getHttpServer()).get('/usuarios/8').expect(200);
    expect(context.usersService.findOne).toHaveBeenCalledWith(8, 7, 'CLIENTE');
    await request(context.app.getHttpServer()).get('/usuarios/7').expect(200);
    expect(context.usersService.findOne).toHaveBeenCalledWith(7, 7, 'CLIENTE');
    context.setUser({ sub: 1, tipo_conta: 'ADMIN' });
    await request(context.app.getHttpServer()).get('/usuarios/8').expect(200);
    expect(context.usersService.findOne).toHaveBeenCalledWith(8, 1, 'ADMIN');
  });

  it('restricts the user list to administrators', async () => {
    await request(context.app.getHttpServer()).get('/usuarios').expect(403);
    context.setUser({ sub: 1, tipo_conta: 'ADMIN' });
    await request(context.app.getHttpServer()).get('/usuarios').expect(200);
  });

  it('passes the authenticated identity to account deletion', async () => {
    await request(context.app.getHttpServer()).delete('/usuarios/7').expect(200);
    expect(context.usersService.remove).toHaveBeenCalledWith(7, 7, 'CLIENTE');
  });
});
