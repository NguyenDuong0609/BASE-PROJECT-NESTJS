import { MigrationInterface, QueryRunner } from 'typeorm';

export class AccountActionTokens1730000000000 implements MigrationInterface {
	name = 'AccountActionTokens1730000000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE "audit_events" (
				"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
				"action" character varying(80) NOT NULL,
				"actor_user_id" uuid,
				"subject_user_id" uuid,
				"metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
				"created_at" TIMESTAMP NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMP NOT NULL DEFAULT now(),
				"deleted_at" TIMESTAMP
			)
		`);
		await queryRunner.query(`
			CREATE INDEX "IDX_audit_events_subject_created"
			ON "audit_events" ("subject_user_id", "created_at")
		`);
		await queryRunner.query(`
			CREATE INDEX "IDX_audit_events_action_created"
			ON "audit_events" ("action", "created_at")
		`);
		await queryRunner.query(`
			CREATE TYPE "account_action_token_purpose_enum"
			AS ENUM ('email_verification', 'password_reset')
		`);
		await queryRunner.query(`
			CREATE TABLE "account_action_tokens" (
				"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
				"user_id" uuid NOT NULL,
				"purpose" "account_action_token_purpose_enum" NOT NULL,
				"token_hash" char(64) NOT NULL,
				"expires_at" TIMESTAMPTZ NOT NULL,
				"consumed_at" TIMESTAMPTZ,
				"created_at" TIMESTAMP NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMP NOT NULL DEFAULT now(),
				"deleted_at" TIMESTAMP,
				CONSTRAINT "FK_account_action_tokens_user"
					FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
			)
		`);
		await queryRunner.query(`
			CREATE UNIQUE INDEX "UQ_account_action_tokens_token_hash"
			ON "account_action_tokens" ("token_hash")
		`);
		await queryRunner.query(`
			CREATE INDEX "IDX_account_action_tokens_user_purpose"
			ON "account_action_tokens" ("user_id", "purpose")
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`DROP INDEX "IDX_account_action_tokens_user_purpose"`,
		);
		await queryRunner.query(`DROP INDEX "UQ_account_action_tokens_token_hash"`);
		await queryRunner.query(`DROP TABLE "account_action_tokens"`);
		await queryRunner.query(`DROP TYPE "account_action_token_purpose_enum"`);
		await queryRunner.query(`DROP INDEX "IDX_audit_events_action_created"`);
		await queryRunner.query(`DROP INDEX "IDX_audit_events_subject_created"`);
		await queryRunner.query(`DROP TABLE "audit_events"`);
	}
}
