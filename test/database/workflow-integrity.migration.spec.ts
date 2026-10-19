import { AddWorkflowIntegrityConstraints1791417600000 } from '../../src/database/migrations/1791417600000-AddWorkflowIntegrityConstraints';

describe('AddWorkflowIntegrityConstraints migration', () => {
  it('stops before DDL when historical appointments mismatch their service provider', async () => {
    const query = jest.fn().mockImplementation(async (sql: string) => (
      sql.includes('appointment."id_prestador" <> service."id_prestador"')
        ? [{ id_agendamento: 42 }]
        : []
    ));

    await expect(
      new AddWorkflowIntegrityConstraints1791417600000().up({ query } as any),
    ).rejects.toThrow('appointments whose service belongs to another provider');
    expect(query.mock.calls.some(([sql]) => /^\s*ALTER TABLE/i.test(sql))).toBe(false);
  });

  it('adds constraints only after all legacy data checks pass', async () => {
    const query = jest.fn().mockResolvedValue([]);

    await new AddWorkflowIntegrityConstraints1791417600000().up({ query } as any);

    const statements = query.mock.calls.map(([sql]) => String(sql));
    const firstAlter = statements.findIndex((sql) => /^\s*ALTER TABLE/i.test(sql));
    expect(firstAlter).toBe(5);
    expect(statements[firstAlter]).toContain('CK_servico_preco_nonnegative');
    expect(statements.at(-1)).toContain('UQ_horarios_provider_interval');
  });
});