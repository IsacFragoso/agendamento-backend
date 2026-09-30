import { MigrationInterface, QueryRunner } from 'typeorm';

export class MoveServiceImageToProviderBanner1760000005000 implements MigrationInterface {
  name = 'MoveServiceImageToProviderBanner1760000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "perfil_prestador" ADD "imagem_banner" text');
    await queryRunner.query(`
      UPDATE "perfil_prestador" AS perfil
      SET "imagem_banner" = origem."imagem_url"
      FROM (
        SELECT DISTINCT ON ("id_prestador") "id_prestador", "imagem_url"
        FROM "servico"
        WHERE "imagem_url" IS NOT NULL
        ORDER BY "id_prestador", "id_servico"
      ) AS origem
      WHERE perfil."id_usuario" = origem."id_prestador"
    `);
    await queryRunner.query('ALTER TABLE "servico" DROP COLUMN "imagem_url"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "servico" ADD "imagem_url" text');
    await queryRunner.query(`
      UPDATE "servico" AS servico
      SET "imagem_url" = perfil."imagem_banner"
      FROM "perfil_prestador" AS perfil
      WHERE servico."id_prestador" = perfil."id_usuario"
        AND servico."imagem_url" IS NULL
        AND perfil."imagem_banner" IS NOT NULL
    `);
    await queryRunner.query('ALTER TABLE "perfil_prestador" DROP COLUMN "imagem_banner"');
  }
}
