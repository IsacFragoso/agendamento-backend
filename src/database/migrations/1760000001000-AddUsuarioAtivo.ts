import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsuarioAtivo1760000001000 implements MigrationInterface {
  name = 'AddUsuarioAtivo1760000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "ativo" boolean NOT NULL DEFAULT true',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "usuario" DROP COLUMN IF EXISTS "ativo"');
  }
}