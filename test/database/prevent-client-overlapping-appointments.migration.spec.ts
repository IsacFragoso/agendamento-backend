import { PreventClientOverlappingAppointments1791590400000 } from '../../src/database/migrations/1791590400000-PreventClientOverlappingAppointments';

describe('PreventClientOverlappingAppointments migration', () => {
  it('stops before DDL when legacy client overlaps exist', async () => {
    const query = jest.fn().mockResolvedValue([{ first: 1, second: 2 }]);

    await expect(
      new PreventClientOverlappingAppointments1791590400000().up({ query } as any),
    ).rejects.toThrow('appointments 1 and 2 overlap for the same client');
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('adds the exclusion constraint when data is clean and removes it on down', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const migration = new PreventClientOverlappingAppointments1791590400000();

    await migration.up({ query } as any);
    expect(String(query.mock.calls[2][0])).toContain('EX_agendamento_cliente_sem_sobreposicao');

    query.mockClear();
    await migration.down({ query } as any);
    expect(String(query.mock.calls[0][0])).toContain(
      'DROP CONSTRAINT "EX_agendamento_cliente_sem_sobreposicao"',
    );
  });
});
