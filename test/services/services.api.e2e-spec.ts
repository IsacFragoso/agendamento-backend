import request from 'supertest';
import { createTestApp } from '../support/test-app';

describe('Services API', () => {
  let context: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => {
    context = await createTestApp();
  });

  afterAll(() => context.app.close());
  beforeEach(() => context.reset());

  it('passes provider identity to service management', async () => {
    context.setUser({ sub: 12, tipo_conta: 'PRESTADOR' });
    await request(context.app.getHttpServer())
      .post('/servicos')
      .send({ id_prestador: 12 })
      .expect(201);
    expect(context.servicesService.create).toHaveBeenCalledWith(expect.anything(), 12, 'PRESTADOR');
  });

  it('forwards provider service status changes', async () => {
    context.setUser({ sub: 12, tipo_conta: 'PRESTADOR' });
    await request(context.app.getHttpServer())
      .patch('/servicos/3')
      .send({ ativo: false })
      .expect(200);
    expect(context.servicesService.update).toHaveBeenCalledWith(
      3,
      { ativo: false },
      12,
      'PRESTADOR',
    );
  });

  it('restricts category management to administrators', async () => {
    await request(context.app.getHttpServer())
      .post('/categorias')
      .send({ nome: 'Beleza' })
      .expect(403);
    context.setUser({ sub: 1, tipo_conta: 'ADMIN' });
    await request(context.app.getHttpServer())
      .post('/categorias')
      .send({ nome: 'Beleza' })
      .expect(201);
  });
});
