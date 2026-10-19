import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkflowIntegrityConstraints1791417600000 implements MigrationInterface {
  name = 'AddWorkflowIntegrityConstraints1791417600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const preflightChecks: Array<[string, string]> = [
      [
        'appointments whose service belongs to another provider',
        `SELECT appointment."id_agendamento"
         FROM "agendamento" appointment
         JOIN "servico" service ON service."id_servico" = appointment."id_servico"
         WHERE appointment."id_prestador" <> service."id_prestador"
         LIMIT 1`,
      ],
      [
        'appointments with invalid time intervals',
        `SELECT "id_agendamento" FROM "agendamento"
         WHERE "data_hora_fim" <= "data_hora_inicio" LIMIT 1`,
      ],
      [
        'appointments with unsupported statuses',
        `SELECT "id_agendamento" FROM "agendamento"
         WHERE "status" NOT IN ('PENDENTE', 'CONFIRMADO', 'CANCELADO', 'CONCLUIDO')
         LIMIT 1`,
      ],
      [
        'services with invalid price or duration',
        `SELECT "id_servico" FROM "servico"
         WHERE "preco" < 0 OR "duracao_padrao" <= 0 LIMIT 1`,
      ],
      [
        'duplicate provider schedule intervals',
        `SELECT "id_prestador", "dia_semana", "hora_inicio", "hora_fim"
         FROM "horarios"
         GROUP BY "id_prestador", "dia_semana", "hora_inicio", "hora_fim"
         HAVING COUNT(*) > 1 LIMIT 1`,
      ],
    ];

    for (const [description, sql] of preflightChecks) {
      const rows = await queryRunner.query(sql);
      if (rows.length > 0) {
        throw new Error(
          `Cannot add workflow integrity constraints: found ${description}. Resolve the reported legacy data and retry the migration.`,
        );
      }
    }

    await queryRunner.query(
      'ALTER TABLE "servico" ADD CONSTRAINT "CK_servico_preco_nonnegative" CHECK ("preco" >= 0)',
    );
    await queryRunner.query(
      'ALTER TABLE "servico" ADD CONSTRAINT "CK_servico_duracao_positive" CHECK ("duracao_padrao" > 0)',
    );
    await queryRunner.query(
      'ALTER TABLE "agendamento" ADD CONSTRAINT "CK_agendamento_intervalo" CHECK ("data_hora_fim" > "data_hora_inicio")',
    );
    await queryRunner.query(
      `ALTER TABLE "agendamento" ADD CONSTRAINT "CK_agendamento_status"
       CHECK ("status" IN ('PENDENTE', 'CONFIRMADO', 'CANCELADO', 'CONCLUIDO'))`,
    );
    await queryRunner.query(
      'ALTER TABLE "servico" ADD CONSTRAINT "UQ_servico_id_prestador" UNIQUE ("id_servico", "id_prestador")',
    );
    await queryRunner.query('ALTER TABLE "agendamento" DROP CONSTRAINT "FK_agendamento_servico"');
    await queryRunner.query(`
      ALTER TABLE "agendamento"
      ADD CONSTRAINT "FK_agendamento_servico_prestador"
      FOREIGN KEY ("id_servico", "id_prestador")
      REFERENCES "servico" ("id_servico", "id_prestador")
      ON DELETE RESTRICT
    `);
    await queryRunner.query('ALTER TABLE "agendamento" DROP CONSTRAINT "FK_agendamento_cliente"');
    await queryRunner.query(`
      ALTER TABLE "agendamento"
      ADD CONSTRAINT "FK_agendamento_cliente"
      FOREIGN KEY ("id_cliente") REFERENCES "usuario" ("id_usuario") ON DELETE RESTRICT
    `);
    await queryRunner.query('ALTER TABLE "agendamento" DROP CONSTRAINT "FK_agendamento_prestador"');
    await queryRunner.query(`
      ALTER TABLE "agendamento"
      ADD CONSTRAINT "FK_agendamento_prestador"
      FOREIGN KEY ("id_prestador") REFERENCES "perfil_prestador" ("id_usuario") ON DELETE RESTRICT
    `);
    await queryRunner.query(
      'ALTER TABLE "horarios" ADD CONSTRAINT "UQ_horarios_provider_interval" UNIQUE ("id_prestador", "dia_semana", "hora_inicio", "hora_fim")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "horarios" DROP CONSTRAINT "UQ_horarios_provider_interval"',
    );
    await queryRunner.query(
      'ALTER TABLE "agendamento" DROP CONSTRAINT "FK_agendamento_servico_prestador"',
    );
    await queryRunner.query('ALTER TABLE "agendamento" DROP CONSTRAINT "FK_agendamento_cliente"');
    await queryRunner.query(`
      ALTER TABLE "agendamento"
      ADD CONSTRAINT "FK_agendamento_cliente"
      FOREIGN KEY ("id_cliente") REFERENCES "usuario" ("id_usuario") ON DELETE CASCADE
    `);
    await queryRunner.query('ALTER TABLE "agendamento" DROP CONSTRAINT "FK_agendamento_prestador"');
    await queryRunner.query(`
      ALTER TABLE "agendamento"
      ADD CONSTRAINT "FK_agendamento_prestador"
      FOREIGN KEY ("id_prestador") REFERENCES "perfil_prestador" ("id_usuario") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "agendamento"
      ADD CONSTRAINT "FK_agendamento_servico"
      FOREIGN KEY ("id_servico") REFERENCES "servico" ("id_servico") ON DELETE CASCADE
    `);
    await queryRunner.query('ALTER TABLE "servico" DROP CONSTRAINT "UQ_servico_id_prestador"');
    await queryRunner.query('ALTER TABLE "agendamento" DROP CONSTRAINT "CK_agendamento_status"');
    await queryRunner.query('ALTER TABLE "agendamento" DROP CONSTRAINT "CK_agendamento_intervalo"');
    await queryRunner.query('ALTER TABLE "servico" DROP CONSTRAINT "CK_servico_duracao_positive"');
    await queryRunner.query('ALTER TABLE "servico" DROP CONSTRAINT "CK_servico_preco_nonnegative"');
  }
}
