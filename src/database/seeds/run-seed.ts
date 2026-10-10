import { seedRoles } from './role.seed';
import dataSource from '../data-source';
import { createContextLogger } from '../../configs/logger.config';

const logger = createContextLogger('SeedRunner');

async function runSeed(): Promise<void> {
	let initialized = false;
	try {
		logger.info('Connecting to database');
		await dataSource.initialize();
		initialized = true;
		logger.info('Database connected; running seeds');
		await seedRoles(dataSource);
		logger.info('Seeding completed successfully');
	} catch (error) {
		logger.error({ err: error }, 'Seeding failed');
		process.exitCode = 1;
	} finally {
		if (initialized) {
			try {
				await dataSource.destroy();
				logger.info('Database connection closed');
			} catch (error) {
				logger.error({ err: error }, 'Failed to close database connection');
				process.exitCode = 1;
			}
		}
	}
}

void runSeed();
