import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerificationTokenIndex1792800000000 implements MigrationInterface {
  name = 'AddEmailVerificationTokenIndex1792800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_usuario_email_verification_token_hash" ON "usuario" ("email_verification_token_hash") WHERE "email_verification_token_hash" IS NOT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_usuario_email_verification_token_hash"');
  }
}
