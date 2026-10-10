import { QueryRunner } from 'typeorm';
import { AddTenantId1790954555707 } from './migrations/1790954555707-AddTenantId';

describe('AddTenantId migration', () => {
	it('keeps optional Stripe customer IDs nullable for local accounts', async () => {
		const query = jest.fn().mockResolvedValue(undefined);

		await new AddTenantId1790954555707().up({
			query,
		} as unknown as QueryRunner);

		expect(query).toHaveBeenCalledWith(
			'ALTER TABLE "users" ALTER COLUMN "stripe_customer_id" DROP NOT NULL',
		);
		expect(
			query.mock.calls.some(([statement]) =>
				statement.includes(
					'ALTER TABLE "users" ALTER COLUMN "stripe_customer_id" SET NOT NULL',
				),
			),
		).toBe(false);
	});
});
