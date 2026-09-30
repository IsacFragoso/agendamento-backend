import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImageUrls1760000002000 implements MigrationInterface {
  name = 'AddImageUrls1760000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "usuario" ADD "foto_perfil" text');
    await queryRunner.query('ALTER TABLE "servico" ADD "imagem_url" text');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "servico" DROP COLUMN "imagem_url"');
    await queryRunner.query('ALTER TABLE "usuario" DROP COLUMN "foto_perfil"');
  }
}
