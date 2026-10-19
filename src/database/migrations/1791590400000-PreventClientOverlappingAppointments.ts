import { MigrationInterface, QueryRunner } from 'typeorm';

export class PreventClientOverlappingAppointments1791590400000 implements MigrationInterface {
  name = 'PreventClientOverlappingAppointments1791590400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const overlaps = await queryRunner.query(`
      SELECT a."id_agendamento" AS "first", b."id_agendamento" AS "second"
      FROM "agendamento" a
      JOIN "agendamento" b
        ON a."id_cliente" = b."id_cliente"
       AND a."id_agendamento" < b."id_agendamento"
       AND a."data_hora_inicio" < b."data_hora_fim"
       AND a."data_hora_fim" > b."data_hora_inicio"
      WHERE a."status" <> 'CANCELADO' AND b."status" <> 'CANCELADO'
      LIMIT 1
    `);
    if (overlaps.length > 0) {
      throw new Error(
        `Cannot prevent overlapping client appointments: appointments ${overlaps[0].first} and ${overlaps[0].second} overlap for the same client. Cancel or reschedule the legacy overlaps and retry the migration.`,
      );
    }

    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS btree_gist');
    await queryRunner.query(`
      ALTER TABLE "agendamento"
      ADD CONSTRAINT "EX_agendamento_cliente_sem_sobreposicao"
      EXCLUDE USING gist (
        "id_cliente" WITH =,
        tsrange("data_hora_inicio", "data_hora_fim") WITH &&
      ) WHERE ("status" <> 'CANCELADO')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "agendamento" DROP CONSTRAINT "EX_agendamento_cliente_sem_sobreposicao"',
    );
  }
}
