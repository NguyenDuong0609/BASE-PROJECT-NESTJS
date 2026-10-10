import { Injectable } from '@nestjs/common';
import {
	HealthIndicatorResult,
	HealthIndicatorService,
} from '@nestjs/terminus';
import { DataSource } from 'typeorm';

@Injectable()
export class MigrationHealthIndicator {
	constructor(
		private readonly dataSource: DataSource,
		private readonly healthIndicatorService: HealthIndicatorService,
	) {}

	async check(key: string): Promise<HealthIndicatorResult> {
		return await this.healthIndicatorService.check(key).attempt(async () => {
			const queryRunner = this.dataSource.createQueryRunner();
			try {
				if (!(await queryRunner.hasTable('migrations'))) {
					throw new Error('Migrations table does not exist');
				}

				const migrations = await queryRunner.query(
					'SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 1',
				);

				if (migrations.length === 0) {
					return {
						message: 'No migrations executed yet',
						count: 0,
					};
				}

				return {
					message: 'Migrations are up to date',
					lastMigration: migrations[0].name,
					timestamp: migrations[0].timestamp,
				};
			} finally {
				await queryRunner.release();
			}
		});
	}
}
