import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceUserLifecycleFields1760000003000 implements MigrationInterface {
  name = 'ReplaceUserLifecycleFields1760000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "usuario" ADD "data_cadastro" TIMESTAMPTZ NOT NULL DEFAULT now()',
    );
    await queryRunner.query('ALTER TABLE "usuario" ADD "deleted_at" TIMESTAMPTZ');
    await queryRunner.query('ALTER TABLE "usuario" DROP COLUMN "data_nascimento"');
    await queryRunner.query('ALTER TABLE "usuario" DROP COLUMN "ativo"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "usuario" ADD "data_nascimento" date');
    await queryRunner.query('ALTER TABLE "usuario" ADD "ativo" boolean NOT NULL DEFAULT true');
    await queryRunner.query('ALTER TABLE "usuario" DROP COLUMN "deleted_at"');
    await queryRunner.query('ALTER TABLE "usuario" DROP COLUMN "data_cadastro"');
  }
}
