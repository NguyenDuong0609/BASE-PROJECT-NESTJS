import { MigrationInterface, QueryRunner } from 'typeorm';

export class BaseSecurityIndexes1792000100000 implements MigrationInterface {
	name = 'BaseSecurityIndexes1792000100000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "users"
			ADD COLUMN IF NOT EXISTS "two_factor_last_counter" bigint
		`);
		const duplicateEmails = await queryRunner.query(`
			SELECT lower(trim("email")) AS normalized_email
			FROM "users"
			GROUP BY lower(trim("email"))
			HAVING COUNT(*) > 1
			LIMIT 1
		`);
		if (duplicateEmails.length > 0) {
			throw new Error(
				'Cannot enforce case-insensitive email uniqueness: duplicate normalized emails exist',
			);
		}

		await queryRunner.query(`
			UPDATE "users" SET "email" = lower(trim("email"))
			WHERE "email" <> lower(trim("email"))
		`);
		await queryRunner.query(`
			CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_email_normalized_unique"
			ON "users" (lower("email"))
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS "IDX_account_action_tokens_expires_at"
			ON "account_action_tokens" ("expires_at")
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS "IDX_audit_events_actor_created"
			ON "audit_events" ("actor_user_id", "created_at")
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS "IDX_audit_events_created_at"
			ON "audit_events" ("created_at")
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS "IDX_audit_events_type_created"
			ON "audit_events" ("event_type", "created_at")
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			'ALTER TABLE "users" DROP COLUMN IF EXISTS "two_factor_last_counter"',
		);
		await queryRunner.query(
			'DROP INDEX IF EXISTS "IDX_audit_events_type_created"',
		);
		await queryRunner.query(
			'DROP INDEX IF EXISTS "IDX_audit_events_created_at"',
		);
		await queryRunner.query(
			'DROP INDEX IF EXISTS "IDX_audit_events_actor_created"',
		);
		await queryRunner.query(
			'DROP INDEX IF EXISTS "IDX_account_action_tokens_expires_at"',
		);
		await queryRunner.query(
			'DROP INDEX IF EXISTS "IDX_users_email_normalized_unique"',
		);
	}
}
