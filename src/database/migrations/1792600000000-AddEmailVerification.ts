import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerification1792600000000 implements MigrationInterface {
  name = 'AddEmailVerification1792600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "usuario" ADD "email_verified_at" TIMESTAMPTZ');
    await queryRunner.query(
      'ALTER TABLE "usuario" ADD "email_verification_token_hash" varchar(64)',
    );
    await queryRunner.query(
      'ALTER TABLE "usuario" ADD "email_verification_expires_at" TIMESTAMPTZ',
    );
    await queryRunner.query(
      'UPDATE "usuario" SET "email_verified_at" = now() WHERE "deleted_at" IS NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "usuario" DROP COLUMN "email_verification_expires_at"');
    await queryRunner.query('ALTER TABLE "usuario" DROP COLUMN "email_verification_token_hash"');
    await queryRunner.query('ALTER TABLE "usuario" DROP COLUMN "email_verified_at"');
  }
}
