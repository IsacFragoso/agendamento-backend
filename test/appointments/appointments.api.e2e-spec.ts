import request from 'supertest';
import { createTestApp } from '../support/test-app';

describe('Appointments API', () => {
  let context: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => {
    context = await createTestApp();
  });

  afterAll(() => context.app.close());
  beforeEach(() => context.reset());

  it('passes the authenticated identity when listing appointments', async () => {
    await request(context.app.getHttpServer()).get('/agendamentos').expect(200);
    expect(context.appointmentsService.findAllForUser).toHaveBeenCalledWith(7, 'CLIENTE');
  });

  it('passes the authenticated identity when viewing one appointment', async () => {
    await request(context.app.getHttpServer()).get('/agendamentos/1').expect(200);
    expect(context.appointmentsService.findOneForUser).toHaveBeenCalledWith(1, 7, 'CLIENTE');
  });

  it('passes client identity to appointment creation', async () => {
    await request(context.app.getHttpServer()).post('/agendamentos').send({ id_servico: 3 }).expect(201);
    expect(context.appointmentsService.create).toHaveBeenCalledWith(expect.anything(), 7, 'CLIENTE');
  });

  it('passes provider identity to status changes', async () => {
    context.setUser({ sub: 12, tipo_conta: 'PRESTADOR' });
    await request(context.app.getHttpServer()).patch('/agendamentos/1/status').send({ status: 'CONFIRMADO' }).expect(200);
    expect(context.appointmentsService.updateStatus).toHaveBeenCalledWith(1, { status: 'CONFIRMADO' }, 12, 'PRESTADOR');
  });

  it('passes client identity to review operations', async () => {
    await request(context.app.getHttpServer()).post('/agendamentos/1/avaliacao').send({ nota_estrelas: 5 }).expect(201);
    expect(context.appointmentsService.createReview).toHaveBeenCalledWith(1, { nota_estrelas: 5 }, 7, 'CLIENTE');
  });
});