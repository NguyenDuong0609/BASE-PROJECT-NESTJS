import { DataSource, Repository } from 'typeorm';
import { Checkin } from '../entities/checkin.entity';
import { CheckinStats } from '../entities/checkin-stats.entity';
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
	createCheckinStub,
	createUserStub,
	createUserRoleStub,
	resetIdCounter,
} from '@test-utils';

describe('CheckinRepository', () => {
	let repository: Repository<Checkin>;
	let dataSource: DataSource;
	let testUser: User;

	beforeAll(async () => {
		dataSource = await createTestDatabase([
			Checkin,
			CheckinStats,
			User,
			UserRole,
			Address,
			FlashCard,
			Collection,
			Topic,
		]);
		repository = dataSource.getRepository(Checkin);

		const roleRepo = dataSource.getRepository(UserRole);
		const userRepo = dataSource.getRepository(User);

		const role = roleRepo.create(createUserRoleStub());
		await roleRepo.save(role);

		testUser = userRepo.create(createUserStub({ role }));
		await userRepo.save(testUser);
	});

	afterAll(async () => await closeTestDatabase(dataSource));
	beforeEach(() => resetIdCounter());
	afterEach(async () => await clearDatabase(dataSource, [Checkin]));

	describe('create', () => {
		it('should create checkin successfully', async () => {
			const stub = createCheckinStub({ user: testUser });
			const result = await repository.save(stub);

			expect(result).toBeDefined();
			expect(result.id).toBeDefined();
			expect(result.streakCount).toBe(1);
		});
	});

	describe('findOne', () => {
		it('should find by user and date', async () => {
			const checkin = await repository.save(
				createCheckinStub({ user: testUser, checkinDate: new Date() }),
			);

			const result = await repository.findOne({
				where: { id: checkin.id },
				relations: ['user'],
			});

			expect(result).toBeDefined();
			expect(result.user.id).toBe(testUser.id);
		});
	});

	describe('findAndCount', () => {
		it('should support date filtering', async () => {
			const today = new Date();
			await repository.save(
				createCheckinStub({ user: testUser, checkinDate: today }),
			);

			const [items, count] = await repository.findAndCount({
				where: { userId: testUser.id },
			});

			expect(count).toBe(1);
			expect(items).toHaveLength(1);
		});
	});
});
