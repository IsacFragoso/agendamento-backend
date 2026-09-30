import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRevokedTokens1760000005000 implements MigrationInterface {
  name = 'CreateRevokedTokens1760000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "revoked_tokens" (
        "id" SERIAL NOT NULL,
        "token" text NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        CONSTRAINT "PK_revoked_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_revoked_tokens_token" UNIQUE ("token")
      )
    `);

    await queryRunner.query(
      'CREATE INDEX "IDX_revoked_tokens_expires_at" ON "revoked_tokens" ("expires_at")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_revoked_tokens_expires_at"');
    await queryRunner.query('DROP TABLE IF EXISTS "revoked_tokens"');
  }
}
