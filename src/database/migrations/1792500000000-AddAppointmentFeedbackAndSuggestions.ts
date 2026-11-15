import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppointmentFeedbackAndSuggestions1792500000000 implements MigrationInterface {
  name = 'AddAppointmentFeedbackAndSuggestions1792500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "agendamento" ADD "motivo_cancelamento" text');
    await queryRunner.query('ALTER TABLE "agendamento" ADD "cancelado_por" character varying(20)');
    await queryRunner.query(
      'ALTER TABLE "avaliacao" ADD "avaliador_tipo" character varying(20) NOT NULL DEFAULT \'CLIENTE\'',
    );
    await queryRunner.query('ALTER TABLE "avaliacao" DROP CONSTRAINT "UQ_avaliacao_agendamento"');
    await queryRunner.query(
      'ALTER TABLE "avaliacao" ADD CONSTRAINT "CK_avaliacao_avaliador_tipo" CHECK ("avaliador_tipo" IN (\'CLIENTE\', \'PRESTADOR\'))',
    );
    await queryRunner.query(
      'ALTER TABLE "avaliacao" ADD CONSTRAINT "UQ_avaliacao_agendamento_avaliador" UNIQUE ("id_agendamento", "avaliador_tipo")',
    );
    await queryRunner.query(`
      CREATE TABLE "sugestao_prestador" (
        "id_sugestao" SERIAL NOT NULL,
        "id_prestador" integer NOT NULL,
        "id_remetente" integer NOT NULL,
        "remetente_tipo" character varying(20) NOT NULL,
        "sugestao" text NOT NULL,
        "data_criacao" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sugestao_prestador" PRIMARY KEY ("id_sugestao"),
        CONSTRAINT "CK_sugestao_remetente_tipo" CHECK ("remetente_tipo" IN ('CLIENTE', 'PRESTADOR')),
        CONSTRAINT "FK_sugestao_prestador" FOREIGN KEY ("id_prestador") REFERENCES "usuario"("id_usuario") ON DELETE CASCADE,
        CONSTRAINT "FK_sugestao_remetente" FOREIGN KEY ("id_remetente") REFERENCES "usuario"("id_usuario") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_sugestao_prestador_data" ON "sugestao_prestador" ("id_prestador", "data_criacao" DESC)',
    );
    await queryRunner.query(`
      CREATE TABLE "password_reset_token" (
        "id" SERIAL NOT NULL,
        "id_usuario" integer NOT NULL,
        "token_hash" character varying(64) NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "used_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_password_reset_token" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_password_reset_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "FK_password_reset_token_usuario" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id_usuario") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_password_reset_token_user_expiration" ON "password_reset_token" ("id_usuario", "expires_at")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const duplicateReviews = await queryRunner.query(`
      SELECT "id_agendamento"
      FROM "avaliacao"
      GROUP BY "id_agendamento"
      HAVING COUNT(*) > 1
      LIMIT 1
    `);
    if (duplicateReviews.length) {
      throw new Error(
        'Cannot revert dual appointment reviews while both participants have reviews; archive provider reviews before retrying.',
      );
    }
    await queryRunner.query('DROP INDEX "IDX_password_reset_token_user_expiration"');
    await queryRunner.query('DROP TABLE "password_reset_token"');
    await queryRunner.query('DROP INDEX "IDX_sugestao_prestador_data"');
    await queryRunner.query('DROP TABLE "sugestao_prestador"');
    await queryRunner.query(
      'ALTER TABLE "avaliacao" DROP CONSTRAINT "UQ_avaliacao_agendamento_avaliador"',
    );
    await queryRunner.query(
      'ALTER TABLE "avaliacao" DROP CONSTRAINT "CK_avaliacao_avaliador_tipo"',
    );
    await queryRunner.query('ALTER TABLE "avaliacao" DROP COLUMN "avaliador_tipo"');
    await queryRunner.query(
      'ALTER TABLE "avaliacao" ADD CONSTRAINT "UQ_avaliacao_agendamento" UNIQUE ("id_agendamento")',
    );
    await queryRunner.query('ALTER TABLE "agendamento" DROP COLUMN "cancelado_por"');
    await queryRunner.query('ALTER TABLE "agendamento" DROP COLUMN "motivo_cancelamento"');
  }
}
