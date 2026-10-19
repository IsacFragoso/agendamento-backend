import { MigrationInterface, QueryRunner } from 'typeorm';

export class PreventOverlappingAppointments1791504000000 implements MigrationInterface {
  name = 'PreventOverlappingAppointments1791504000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const overlaps = await queryRunner.query(`
      SELECT a."id_agendamento" AS "first", b."id_agendamento" AS "second"
      FROM "agendamento" a
      JOIN "agendamento" b
        ON a."id_prestador" = b."id_prestador"
       AND a."id_agendamento" < b."id_agendamento"
       AND a."data_hora_inicio" < b."data_hora_fim"
       AND a."data_hora_fim" > b."data_hora_inicio"
      WHERE a."status" <> 'CANCELADO' AND b."status" <> 'CANCELADO'
      LIMIT 1
    `);
    if (overlaps.length > 0) {
      throw new Error(
        `Cannot prevent overlapping appointments: appointments ${overlaps[0].first} and ${overlaps[0].second} overlap for the same provider. Cancel or reschedule the legacy overlaps and retry the migration.`,
      );
    }

    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS btree_gist');
    await queryRunner.query(`
      ALTER TABLE "agendamento"
      ADD CONSTRAINT "EX_agendamento_prestador_sem_sobreposicao"
      EXCLUDE USING gist (
        "id_prestador" WITH =,
        tsrange("data_hora_inicio", "data_hora_fim") WITH &&
      ) WHERE ("status" <> 'CANCELADO')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "agendamento" DROP CONSTRAINT "EX_agendamento_prestador_sem_sobreposicao"',
    );
  }
}
