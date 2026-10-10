import * as bcrypt from 'bcryptjs';
import { QueryRunner } from 'typeorm';
import { ProductionSecurity1710000000000 } from './migrations/1710000000000-ProductionSecurity';

describe('ProductionSecurity migration', () => {
	it('preserves legacy users while hashing passwords and revoking old refresh tokens', async () => {
		const existingHash = await bcrypt.hash('already-hashed', 4);
		const query = jest
			.fn()
			.mockResolvedValueOnce(undefined)
			.mockResolvedValueOnce([
				{ id: 'legacy-user', password: 'legacy-password' },
				{ id: 'hashed-user', password: existingHash },
			])
			.mockResolvedValueOnce(undefined)
			.mockResolvedValueOnce(undefined);
		const queryRunner = { query } as unknown as QueryRunner;

		await new ProductionSecurity1710000000000().up(queryRunner);

		expect(query.mock.calls[0][0]).toContain(
			`ALTER TYPE "user_role_enum" ADD VALUE IF NOT EXISTS 'TeamLeader'`,
		);
		expect(query.mock.calls[1][0]).toContain(
			'SELECT "id", "password" FROM "users" WHERE "password" IS NOT NULL',
		);

		const [passwordUpdate, passwordParameters] = query.mock.calls[2];
		expect(passwordUpdate).toContain(
			'UPDATE "users" SET "password" = $1 WHERE "id" = $2',
		);
		expect(passwordParameters[1]).toBe('legacy-user');
		expect(await bcrypt.compare('legacy-password', passwordParameters[0])).toBe(
			true,
		);

		expect(query.mock.calls[3][0]).toContain(
			'UPDATE "users" SET "current_refresh_token" = NULL WHERE "current_refresh_token" IS NOT NULL',
		);
		expect(query).toHaveBeenCalledTimes(4);
	});
});
