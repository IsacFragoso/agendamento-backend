import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProviderPublicLocation1792400000000 implements MigrationInterface {
  name = 'AddProviderPublicLocation1792400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "perfil_prestador" ADD "cidade" character varying(100)');
    await queryRunner.query('ALTER TABLE "perfil_prestador" ADD "estado" character varying(2)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "perfil_prestador" DROP COLUMN "estado"');
    await queryRunner.query('ALTER TABLE "perfil_prestador" DROP COLUMN "cidade"');
  }
}
