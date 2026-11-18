import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerificationAttempts1792700000000 implements MigrationInterface {
  name = 'AddEmailVerificationAttempts1792700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "email_verification_attempt" (
        "id" SERIAL NOT NULL,
        "email_hash" varchar(64) NOT NULL,
        "ip_hash" varchar(64) NOT NULL,
        "requested_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_email_verification_attempt" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_email_verification_attempt_email_time" ON "email_verification_attempt" ("email_hash", "requested_at")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_email_verification_attempt_ip_time" ON "email_verification_attempt" ("ip_hash", "requested_at")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_email_verification_attempt_time" ON "email_verification_attempt" ("requested_at")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_email_verification_attempt_time"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_email_verification_attempt_ip_time"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_email_verification_attempt_email_time"');
    await queryRunner.query('DROP TABLE IF EXISTS "email_verification_attempt"');
  }
}
