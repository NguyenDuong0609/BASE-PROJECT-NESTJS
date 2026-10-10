import { DataSource, EntityTarget, Repository } from 'typeorm';
import { newDb } from 'pg-mem';
import { UserRole } from '../modules/user-roles/entities/user-role.entity';
import { Permission } from '../modules/permissions/entities/permission.entity';

/**
 * Create an in-memory PostgreSQL database for testing
 * Uses pg-mem to simulate PostgreSQL without actual database connection
 *
 * @param entities - Array of TypeORM entities to sync
 * @returns TypeORM DataSource with in-memory database
 *
 * @example
 * const dataSource = await createTestDatabase([User, Post, Comment]);
 * const userRepo = dataSource.getRepository(User);
 * await userRepo.save({ email: 'test@example.com' });
 */
export async function createTestDatabase(
	entities: EntityTarget<any>[],
): Promise<DataSource> {
	const db = newDb({
		autoCreateForeignKeyIndices: true,
	});

	// Register PostgreSQL functions that pg-mem doesn't support by default
	db.public.registerFunction({
		name: 'current_database',
		implementation: () => 'test',
	});

	db.public.registerFunction({
		name: 'version',
		implementation: () => 'PostgreSQL 15.0 (pg-mem)',
	});

	db.public.registerFunction({
		name: 'uuid_generate_v4',
		implementation: () => {
			return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
				const r = (Math.random() * 16) | 0;
				const v = c === 'x' ? r : (r & 0x3) | 0x8;
				return v.toString(16);
			});
		},
	});

	// Create TypeORM DataSource adapted from pg-mem
	const dataSource = await db.adapters.createTypeormDataSource({
		type: 'postgres',
		entities: entities.includes(UserRole)
			? [...new Set([...entities, Permission])]
			: entities,
		synchronize: true, // Auto-create schema in test DB
	});

	await dataSource.initialize();
	// Note: Skip the second synchronize() call as pg-mem has limitations
	// The first synchronize: true in options is sufficient

	return dataSource;
}

/**
 * Close and cleanup test database
 * Call this in afterAll or afterEach to prevent memory leaks
 *
 * @param dataSource - TypeORM DataSource to close
 *
 * @example
 * afterAll(async () => {
 *   await closeTestDatabase(dataSource);
 * });
 */
export async function closeTestDatabase(dataSource: DataSource): Promise<void> {
	if (dataSource && dataSource.isInitialized) {
		await dataSource.destroy();
	}
}

/**
 * Clear all data from repositories while keeping schema
 * Useful for cleaning between tests
 *
 * @param dataSource - TypeORM DataSource
 * @param entities - Array of entities to clear
 *
 * @example
 * beforeEach(async () => {
 *   await clearDatabase(dataSource, [User, Post]);
 * });
 */
export async function clearDatabase(
	dataSource: DataSource,
	entities: EntityTarget<any>[],
): Promise<void> {
	// Clear entities in reverse order to avoid foreign key constraint issues
	for (const entity of [...entities].reverse()) {
		const repository = dataSource.getRepository(entity);
		// Get all records and delete them (avoids empty criteria error)
		const all = await repository.find({ withDeleted: true });
		if (all.length > 0) {
			await repository.remove(all);
		}
	}
}

/**
 * Get a repository from test database
 * Type-safe helper for getting repositories
 *
 * @param dataSource - TypeORM DataSource
 * @param entity - Entity class
 * @returns Repository instance
 *
 * @example
 * const userRepo = getTestRepository(dataSource, User);
 */
export function getTestRepository<T>(
	dataSource: DataSource,
	entity: EntityTarget<T>,
): Repository<T> {
	return dataSource.getRepository(entity);
}
