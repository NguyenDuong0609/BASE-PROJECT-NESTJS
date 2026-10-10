import { MigrationInterface, QueryRunner } from 'typeorm';

export class BaseProjectFeatures1720000000000 implements MigrationInterface {
	name = 'BaseProjectFeatures1720000000000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "users" ALTER COLUMN "stripe_customer_id" DROP DEFAULT`,
		);
		await queryRunner.query(
			`UPDATE "users" SET "stripe_customer_id" = NULL WHERE "stripe_customer_id" = 'cus_mock_id'`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "users" ALTER COLUMN "stripe_customer_id" SET DEFAULT 'cus_mock_id'`,
		);
	}
}
