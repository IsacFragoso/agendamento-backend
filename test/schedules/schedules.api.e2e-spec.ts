import request from 'supertest';
import { createTestApp } from '../support/test-app';

describe('Schedules API', () => {
  let context: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => {
    context = await createTestApp();
  });

  afterAll(() => context.app.close());
  beforeEach(() => context.reset());

  it('returns provider availability for a service and date', async () => {
    await request(context.app.getHttpServer())
      .get('/prestadores/7/horario/disponibilidade?servico_id=3&data=2026-10-13')
      .expect(200)
      .expect([
        {
          hora: '09:00',
          inicio: '2026-10-13T12:00:00.000Z',
          fim: '2026-10-13T13:00:00.000Z',
          disponivel: true,
        },
      ]);
    expect(context.schedulesService.getAvailableSlots).toHaveBeenCalledWith(7, {
      servico_id: '3',
      data: '2026-10-13',
    });
  });

  it('passes provider identity to schedule updates', async () => {
    context.setUser({ sub: 12, tipo_conta: 'PRESTADOR' });
    await request(context.app.getHttpServer()).put('/prestadores/12/horario').send({}).expect(200);
    expect(context.schedulesService.update).toHaveBeenCalledWith(12, {}, 12, 'PRESTADOR');
  });
});
