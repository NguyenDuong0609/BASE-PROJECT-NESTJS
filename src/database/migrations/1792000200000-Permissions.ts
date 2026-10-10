import { MigrationInterface, QueryRunner } from 'typeorm';

export class Permissions1792000200000 implements MigrationInterface {
	name = 'Permissions1792000200000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE "permissions" (
				"id" uuid NOT NULL DEFAULT gen_random_uuid(),
				"created_at" TIMESTAMP NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMP NOT NULL DEFAULT now(),
				"deleted_at" TIMESTAMP,
				"code" character varying(120) NOT NULL,
				"description" character varying(255) NOT NULL,
				CONSTRAINT "PK_permissions_id" PRIMARY KEY ("id"),
				CONSTRAINT "UQ_permissions_code" UNIQUE ("code")
			)
		`);
		await queryRunner.query(`
			CREATE TABLE "permission_roles" (
				"role_id" uuid NOT NULL,
				"permission_id" uuid NOT NULL,
				CONSTRAINT "PK_permission_roles" PRIMARY KEY ("role_id", "permission_id"),
				CONSTRAINT "FK_permission_roles_role" FOREIGN KEY ("role_id")
					REFERENCES "user_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
				CONSTRAINT "FK_permission_roles_permission" FOREIGN KEY ("permission_id")
					REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE
			)
		`);
		await queryRunner.query(`
			CREATE INDEX "IDX_permission_roles_permission_id"
			ON "permission_roles" ("permission_id")
		`);
		await queryRunner.query(`
			INSERT INTO "permissions" ("code", "description") VALUES
			('flash-cards:read', 'Read owned flash cards'),
			('flash-cards:create', 'Create flash cards'),
			('flash-cards:update', 'Update owned flash cards'),
			('flash-cards:delete', 'Delete owned flash cards')
		`);
		await queryRunner.query(`
			INSERT INTO "permission_roles" ("role_id", "permission_id")
			SELECT r."id", p."id"
			FROM "user_roles" r CROSS JOIN "permissions" p
			WHERE r."name" = 'Admin'
		`);
		await queryRunner.query(`
			INSERT INTO "permission_roles" ("role_id", "permission_id")
			SELECT r."id", p."id"
			FROM "user_roles" r JOIN "permissions" p
				ON p."code" IN ('flash-cards:read', 'flash-cards:create')
			WHERE r."name" = 'User'
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			'DROP INDEX IF EXISTS "IDX_permission_roles_permission_id"',
		);
		await queryRunner.query('DROP TABLE IF EXISTS "permission_roles"');
		await queryRunner.query('DROP TABLE IF EXISTS "permissions"');
	}
}
