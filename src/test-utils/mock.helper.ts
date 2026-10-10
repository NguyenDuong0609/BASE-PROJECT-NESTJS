import { createMock } from '@golevelup/ts-jest';

/**
 * Create a mock with auto-implemented methods using @golevelup/ts-jest
 * @example
 * const mockService = createAutoMock(UsersService);
 * mockService.findOne.mockResolvedValue(user);
 */
export function createAutoMock<T extends object>(
	type?: new (...args: any[]) => T,
): jest.Mocked<T> {
	void type;
	return createMock<T>() as jest.Mocked<T>;
}

/**
 * Create a partial mock with specific properties
 * Useful for creating test data objects
 * @example
 * const mockUser = createPartialMock<User>({
 *   id: '123',
 *   email: 'test@example.com'
 * });
 */
export function createPartialMock<T>(partial: Partial<T>): T {
	return partial as T;
}

/**
 * Create a spy on all methods of an object
 * Useful for tracking method calls during tests
 * @example
 * spyOnAllMethods(myService);
 * expect(myService.someMethod).toHaveBeenCalled();
 */
export function spyOnAllMethods(obj: any): void {
	if (!obj) return;

	const prototype = Object.getPrototypeOf(obj);
	const propertyNames = Object.getOwnPropertyNames(prototype);

	propertyNames.forEach((method) => {
		if (method !== 'constructor' && typeof obj[method] === 'function') {
			jest.spyOn(obj, method);
		}
	});
}

/**
 * Create a mock repository with common TypeORM methods
 * @example
 * const mockRepo = createMockRepository();
 * mockRepo.save.mockResolvedValue(entity);
 */
export function createMockRepository() {
	return {
		find: jest.fn(),
		findOne: jest.fn(),
		findOneBy: jest.fn(),
		findAndCount: jest.fn(),
		save: jest.fn(),
		create: jest.fn(),
		update: jest.fn(),
		delete: jest.fn(),
		softDelete: jest.fn(),
		remove: jest.fn(),
		createQueryBuilder: jest.fn(() => ({
			where: jest.fn().mockReturnThis(),
			andWhere: jest.fn().mockReturnThis(),
			orWhere: jest.fn().mockReturnThis(),
			orderBy: jest.fn().mockReturnThis(),
			skip: jest.fn().mockReturnThis(),
			take: jest.fn().mockReturnThis(),
			leftJoinAndSelect: jest.fn().mockReturnThis(),
			innerJoinAndSelect: jest.fn().mockReturnThis(),
			getMany: jest.fn(),
			getOne: jest.fn(),
			getManyAndCount: jest.fn(),
			execute: jest.fn(),
		})),
	} as any;
}

/**
 * Create a mock for DataSource (TypeORM connection)
 * @example
 * const mockDataSource = createMockDataSource();
 */
export function createMockDataSource() {
	return {
		manager: {
			transaction: jest.fn((cb) =>
				cb({
					getRepository: jest.fn().mockReturnValue(createMockRepository()),
					save: jest.fn(),
					remove: jest.fn(),
				}),
			),
			getRepository: jest.fn().mockReturnValue(createMockRepository()),
		},
		getRepository: jest.fn().mockReturnValue(createMockRepository()),
		createQueryRunner: jest.fn(),
	} as any;
}
