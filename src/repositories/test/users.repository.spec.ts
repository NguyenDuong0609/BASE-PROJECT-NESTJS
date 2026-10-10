import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UsersRepository } from '@repositories/users.repository';
import { User } from '@modules/users/entities/user.entity';
import { UserRole } from '@modules/user-roles/entities/user-role.entity';
import { Address } from '@modules/users/entities/address.entity';
import { FlashCard } from '@modules/flash-cards/entities/flash-card.entity';
import { Collection } from '@modules/collections/entities/collection.entity';
import { Topic } from '@modules/topics/entities/topic.entity';
import {
	createTestDatabase,
	closeTestDatabase,
	clearDatabase,
	createUserStub,
	createUserRoleStub,
	resetIdCounter,
} from '@test-utils';

describe('UsersRepository', () => {
	let repository: UsersRepository;
	let dataSource: DataSource;
	let userRole: UserRole;

	beforeAll(async () => {
		// Create in-memory database with required entities
		dataSource = await createTestDatabase([
			User,
			UserRole,
			Address,
			FlashCard,
			Collection,
			Topic,
		]);

		await Test.createTestingModule({
			providers: [
				UsersRepository,
				{
					provide: 'UserRepository',
					useValue: dataSource.getRepository(User),
				},
			],
		}).compile();

		repository = new UsersRepository(dataSource.getRepository(User));

		// Create a default role for tests
		const roleRepo = dataSource.getRepository(UserRole);
		userRole = roleRepo.create(createUserRoleStub());
		await roleRepo.save(userRole);
	}, 30_000);

	afterAll(async () => {
		await closeTestDatabase(dataSource);
	});

	beforeEach(() => {
		resetIdCounter();
	});

	afterEach(async () => {
		await clearDatabase(dataSource, [User]);
	});

	describe('create', () => {
		it('should create a new user successfully', async () => {
			// Arrange
			const userStub = createUserStub({ role: userRole });

			// Act
			const result = await repository.create(userStub);

			// Assert
			expect(result).toBeDefined();
			expect(result.id).toBeDefined();
			expect(result.email).toBe(userStub.email);
			expect(result.username).toBe(userStub.username);
			expect(result.first_name).toBe(userStub.first_name);
			expect(result.last_name).toBe(userStub.last_name);
		});

		it('should hash password before saving', async () => {
			// Arrange
			const userStub = createUserStub({
				password: 'plainPassword123',
				role: userRole,
			});

			// Act
			const result = await repository.create(userStub);

			// Assert
			expect(result.password).toBeDefined();
			expect(result.password).not.toBe('plainPassword123');
			expect(result.password).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
		});

		it('should set default values for new user', async () => {
			// Arrange
			const userStub = createUserStub({ role: userRole });

			// Act
			const result = await repository.create(userStub);

			// Assert
			expect(result.point).toBe(0);
			expect(result.isEmailVerified).toBe(true);
			expect(result.authProvider).toBe('local');
			expect(result.created_at).toBeDefined();
			expect(result.updated_at).toBeDefined();
		});
	});

	describe('findOneById', () => {
		it('should find user by id', async () => {
			// Arrange
			const user = await repository.create(createUserStub({ role: userRole }));

			// Act
			const result = await repository.findOneById(user.id);

			// Assert
			expect(result).toBeDefined();
			expect(result.id).toBe(user.id);
			expect(result.email).toBe(user.email);
		});

		it('should return null if user not found', async () => {
			// Act
			const result = await repository.findOneById(
				'00000000-0000-4000-8000-999999999999',
			);

			// Assert
			expect(result).toBeNull();
		});

		it('should load relations when specified', async () => {
			// Arrange
			const user = await repository.create(createUserStub({ role: userRole }));

			// Act
			const result = await repository.findOneById(user.id, {
				relations: ['role'],
			});

			// Assert
			expect(result).toBeDefined();
			expect(result.role).toBeDefined();
			expect(result.role.id).toBe(userRole.id);
		});
	});

	describe('findOneByCondition', () => {
		it('should find user by email', async () => {
			// Arrange
			const user = await repository.create(
				createUserStub({
					email: 'test@example.com',
					role: userRole,
				}),
			);

			// Act
			const result = await repository.findOneByCondition({
				email: 'test@example.com',
			});

			// Assert
			expect(result).toBeDefined();
			expect(result.id).toBe(user.id);
			expect(result.email).toBe('test@example.com');
		});

		it('should find user by username', async () => {
			// Arrange
			const user = await repository.create(
				createUserStub({
					username: 'testuser',
					role: userRole,
				}),
			);

			// Act
			const result = await repository.findOneByCondition({
				username: 'testuser',
			});

			// Assert
			expect(result).toBeDefined();
			expect(result.id).toBe(user.id);
			expect(result.username).toBe('testuser');
		});

		it('should return null if no match found', async () => {
			// Act
			const result = await repository.findOneByCondition({
				email: 'nonexistent@example.com',
			});

			// Assert
			expect(result).toBeNull();
		});
	});

	describe('findAll', () => {
		it('should return all users with count', async () => {
			// Arrange
			await repository.create(createUserStub({ role: userRole }));
			await repository.create(
				createUserStub({
					email: 'user2@example.com',
					username: 'user2',
					role: userRole,
				}),
			);
			await repository.create(
				createUserStub({
					email: 'user3@example.com',
					username: 'user3',
					role: userRole,
				}),
			);

			// Act
			const result = await repository.findAll();

			// Assert
			expect(result.count).toBe(3);
			expect(result.items).toHaveLength(3);
		});

		it('should support pagination with skip and take', async () => {
			// Arrange
			for (let i = 0; i < 5; i++) {
				await repository.create(
					createUserStub({
						email: `user${i}@example.com`,
						username: `user${i}`,
						role: userRole,
					}),
				);
			}

			// Act
			const result = await repository.findAll({
				skip: 2,
				take: 2,
			});

			// Assert
			expect(result.count).toBe(5);
			expect(result.items).toHaveLength(2);
		});

		it('should support filtering with where clause', async () => {
			// Arrange
			await repository.create(
				createUserStub({
					email: 'admin@example.com',
					role: userRole,
				}),
			);
			await repository.create(
				createUserStub({
					email: 'user@example.com',
					username: 'regularuser',
					role: userRole,
				}),
			);

			// Act
			const result = await repository.findAll({
				where: { email: 'admin@example.com' },
			});

			// Assert
			expect(result.count).toBe(1);
			expect(result.items[0].email).toBe('admin@example.com');
		});

		it('should support ordering', async () => {
			// Arrange
			await repository.create(
				createUserStub({
					username: 'charlie',
					role: userRole,
				}),
			);
			await repository.create(
				createUserStub({
					username: 'alice',
					email: 'alice@example.com',
					role: userRole,
				}),
			);
			await repository.create(
				createUserStub({
					username: 'bob',
					email: 'bob@example.com',
					role: userRole,
				}),
			);

			// Act
			const result = await repository.findAll({
				order: { username: 'ASC' },
			});

			// Assert
			expect(result.items[0].username).toBe('alice');
			expect(result.items[1].username).toBe('bob');
			expect(result.items[2].username).toBe('charlie');
		});
	});

	describe('update', () => {
		it('should update user successfully', async () => {
			// Arrange
			const user = await repository.create(createUserStub({ role: userRole }));
			const updateData = {
				first_name: 'Updated',
				last_name: 'Name',
			};

			// Act
			const result = await repository.update(user.id, updateData);

			// Assert
			expect(result).toBeDefined();
			expect(result.id).toBe(user.id);
			expect(result.first_name).toBe('Updated');
			expect(result.last_name).toBe('Name');
			expect(result.updated_at).toBeDefined();
		});

		it('should only update specified fields', async () => {
			// Arrange
			const user = await repository.create(
				createUserStub({
					email: 'original@example.com',
					role: userRole,
				}),
			);
			const updateData = { first_name: 'Updated' };

			// Act
			const result = await repository.update(user.id, updateData);

			// Assert
			expect(result.first_name).toBe('Updated');
			expect(result.email).toBe('original@example.com'); // Unchanged
		});

		it('should return updated user', async () => {
			// Arrange
			const user = await repository.create(createUserStub({ role: userRole }));

			// Act
			const result = await repository.update(user.id, { point: 100 });

			// Assert
			expect(result.id).toBe(user.id);
			expect(result.point).toBe(100);
		});

		it('should reject updates that violate a unique constraint', async () => {
			const existingUser = await repository.create(
				createUserStub({
					email: 'existing@example.com',
					username: 'existing',
					role: userRole,
				}),
			);
			const updatedUser = await repository.create(
				createUserStub({
					email: 'update@example.com',
					username: 'update',
					role: userRole,
				}),
			);

			await expect(
				repository.update(updatedUser.id, { email: existingUser.email }),
			).rejects.toThrow(ConflictException);
		});
	});

	describe('softDelete', () => {
		it('should soft delete user successfully', async () => {
			// Arrange
			const user = await repository.create(createUserStub({ role: userRole }));

			// Act
			const result = await repository.softDelete(user.id);

			// Assert
			expect(result).toBe(true);

			// Verify user is soft deleted
			const deletedUser = await repository.findOneById(user.id);
			expect(deletedUser).toBeNull();
		});

		it('should throw NotFoundException if user not found', async () => {
			// Act
			// Assert
			await expect(
				repository.softDelete('00000000-0000-4000-8000-999999999999'),
			).rejects.toThrow('Record not found');
		});

		it('should not affect other users', async () => {
			// Arrange
			const user1 = await repository.create(createUserStub({ role: userRole }));
			const user2 = await repository.create(
				createUserStub({
					email: 'user2@example.com',
					username: 'user2',
					role: userRole,
				}),
			);

			// Act
			await repository.softDelete(user1.id);

			// Assert
			const remainingUser = await repository.findOneById(user2.id);
			expect(remainingUser).toBeDefined();
			expect(remainingUser.id).toBe(user2.id);
		});
	});

	describe('permanentlyDelete', () => {
		it('should permanently delete user', async () => {
			// Arrange
			const user = await repository.create(createUserStub({ role: userRole }));

			// Act
			const result = await repository.permanentlyDelete(user.id);

			// Assert
			expect(result).toBe(true);

			// Verify user is permanently deleted (even with withDeleted)
			const userRepo = dataSource.getRepository(User);
			const deletedUser = await userRepo.findOne({
				where: { id: user.id },
				withDeleted: true,
			});
			expect(deletedUser).toBeNull();
		});

		it('should return false if user not found', async () => {
			// Act
			const result = await repository.permanentlyDelete(
				'00000000-0000-4000-8000-999999999999',
			);

			// Assert
			expect(result).toBe(false);
		});
	});
});
