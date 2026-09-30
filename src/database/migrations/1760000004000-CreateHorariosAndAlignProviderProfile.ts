import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHorariosAndAlignProviderProfile1760000004000 implements MigrationInterface {
  name = 'CreateHorariosAndAlignProviderProfile1760000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "horarios" (
        "id_horario" SERIAL NOT NULL,
        "dia_semana" smallint NOT NULL,
        "hora_inicio" time NOT NULL,
        "hora_fim" time NOT NULL,
        "id_prestador" integer NOT NULL,
        CONSTRAINT "PK_horarios" PRIMARY KEY ("id_horario"),
        CONSTRAINT "FK_horarios_prestador" FOREIGN KEY ("id_prestador")
          REFERENCES "perfil_prestador"("id_prestador") ON DELETE CASCADE,
        CONSTRAINT "CK_horarios_dia" CHECK ("dia_semana" BETWEEN 0 AND 6),
        CONSTRAINT "CK_horarios_intervalo" CHECK ("hora_inicio" < "hora_fim")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "horarios" ("dia_semana", "hora_inicio", "hora_fim", "id_prestador")
      SELECT
        CASE upper(trim(day_name))
          WHEN 'DOMINGO' THEN 0
          WHEN 'SEGUNDA' THEN 1
          WHEN 'TERCA' THEN 2
          WHEN 'TERÇA' THEN 2
          WHEN 'QUARTA' THEN 3
          WHEN 'QUINTA' THEN 4
          WHEN 'SEXTA' THEN 5
          WHEN 'SABADO' THEN 6
          WHEN 'SÁBADO' THEN 6
        END,
        "horario_inicio",
        "horario_fim",
        "id_prestador"
      FROM "perfil_prestador",
        regexp_split_to_table(coalesce("dias_atendimento", ''), ',') AS day_name
      WHERE "dias_atendimento" IS NOT NULL
        AND "horario_inicio" IS NOT NULL
        AND "horario_fim" IS NOT NULL
        AND upper(trim(day_name)) IN (
          'DOMINGO', 'SEGUNDA', 'TERCA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO', 'SÁBADO'
        )
    `);

    await queryRunner.query(
      'ALTER TABLE "perfil_prestador" RENAME COLUMN "id_prestador" TO "id_usuario"',
    );
    await queryRunner.query('ALTER TABLE "perfil_prestador" DROP COLUMN "foto_perfil"');
    await queryRunner.query('ALTER TABLE "perfil_prestador" DROP COLUMN "dias_atendimento"');
    await queryRunner.query('ALTER TABLE "perfil_prestador" DROP COLUMN "horario_inicio"');
    await queryRunner.query('ALTER TABLE "perfil_prestador" DROP COLUMN "horario_fim"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "perfil_prestador" ADD "foto_perfil" text');
    await queryRunner.query('ALTER TABLE "perfil_prestador" ADD "dias_atendimento" varchar(100)');
    await queryRunner.query('ALTER TABLE "perfil_prestador" ADD "horario_inicio" time');
    await queryRunner.query('ALTER TABLE "perfil_prestador" ADD "horario_fim" time');
    await queryRunner.query(
      'ALTER TABLE "perfil_prestador" RENAME COLUMN "id_usuario" TO "id_prestador"',
    );
    await queryRunner.query('DROP TABLE "horarios"');
  }
}
