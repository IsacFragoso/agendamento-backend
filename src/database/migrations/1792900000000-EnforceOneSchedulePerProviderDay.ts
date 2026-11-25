import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnforceOneSchedulePerProviderDay1792900000000 implements MigrationInterface {
  name = 'EnforceOneSchedulePerProviderDay1792900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH ranked AS (
        SELECT "id_horario",
               ROW_NUMBER() OVER (
                 PARTITION BY "id_prestador", "dia_semana"
                 ORDER BY "id_horario" ASC
               ) AS position
        FROM "horarios"
      )
      DELETE FROM "horarios"
      WHERE "id_horario" IN (
        SELECT "id_horario" FROM ranked WHERE position > 1
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_horarios_provider_day" ON "horarios" ("id_prestador", "dia_semana")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_horarios_provider_day"');
  }
}
