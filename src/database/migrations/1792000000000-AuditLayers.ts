import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuditLayers1792000000000 implements MigrationInterface {
	name = 'AuditLayers1792000000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "audit_events"
			ADD COLUMN "event_type" character varying(20) NOT NULL DEFAULT 'security',
			ADD COLUMN "resource_type" character varying(80),
			ADD COLUMN "resource_id" character varying(255)
		`);
		await queryRunner.query(`
			CREATE INDEX "IDX_audit_events_resource_created"
			ON "audit_events" ("resource_type", "resource_id", "created_at")
		`);
		await queryRunner.query(`
			INSERT INTO "audit_events" (
				"id", "event_type", "action", "actor_user_id", "subject_user_id",
				"resource_type", "resource_id", "metadata", "created_at", "updated_at"
			)
			SELECT
				"id",
				'business',
				"action",
				CASE WHEN "userId" ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
					THEN "userId"::uuid ELSE NULL END,
				CASE WHEN "userId" ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
					THEN "userId"::uuid ELSE NULL END,
				"resource",
				"resourceId",
				'{}'::jsonb,
				"createdAt",
				"createdAt"
			FROM "audit_logs"
			ON CONFLICT ("id") DO NOTHING
		`);
		if (process.env.ENABLE_PGAUDIT === 'true') {
			await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pgaudit');
		}
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			'DROP INDEX IF EXISTS "IDX_audit_events_resource_created"',
		);
		await queryRunner.query(`
			ALTER TABLE "audit_events"
			DROP COLUMN "resource_id",
			DROP COLUMN "resource_type",
			DROP COLUMN "event_type"
		`);
	}
}
