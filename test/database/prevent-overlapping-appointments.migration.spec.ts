import { PreventOverlappingAppointments1791504000000 } from '../../src/database/migrations/1791504000000-PreventOverlappingAppointments';

describe('PreventOverlappingAppointments migration', () => {
  it('stops before DDL when legacy overlaps exist', async () => {
    const query = jest.fn().mockResolvedValue([{ first: 1, second: 2 }]);

    await expect(
      new PreventOverlappingAppointments1791504000000().up({ query } as any),
    ).rejects.toThrow('appointments 1 and 2 overlap');
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('adds the exclusion constraint when data is clean and removes it on down', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const migration = new PreventOverlappingAppointments1791504000000();

    await migration.up({ query } as any);
    const statements = query.mock.calls.map(([sql]) => String(sql));
    expect(statements[1]).toContain('btree_gist');
    expect(statements[2]).toContain('EXCLUDE USING gist');

    query.mockClear();
    await migration.down({ query } as any);
    expect(String(query.mock.calls[0][0])).toContain(
      'DROP CONSTRAINT "EX_agendamento_prestador_sem_sobreposicao"',
    );
  });
});
