import * as bcrypt from 'bcryptjs';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductionSecurity1710000000000 implements MigrationInterface {
	name = 'ProductionSecurity1710000000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TYPE "user_role_enum" ADD VALUE IF NOT EXISTS 'TeamLeader'`,
		);

		const users: Array<{ id: string; password: string }> =
			await queryRunner.query(
				'SELECT "id", "password" FROM "users" WHERE "password" IS NOT NULL',
			);
		for (const user of users) {
			if (!/^\$2[aby]\$\d{2}\$/.test(user.password)) {
				await queryRunner.query(
					'UPDATE "users" SET "password" = $1 WHERE "id" = $2',
					[await bcrypt.hash(user.password, 12), user.id],
				);
			}
		}
		await queryRunner.query(
			'UPDATE "users" SET "current_refresh_token" = NULL WHERE "current_refresh_token" IS NOT NULL',
		);
	}

	public async down(): Promise<void> {
		// Password hashes are intentionally irreversible; keep the additive role value.
	}
}
