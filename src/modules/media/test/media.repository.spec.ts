import { DataSource, Repository } from 'typeorm';
import { MediaFile, MediaFileStatus } from '../entities/media-file.entity';
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
	createMediaFileStub,
	createUserStub,
	createUserRoleStub,
	resetIdCounter,
} from '@test-utils';

describe('MediaRepository', () => {
	let repository: Repository<MediaFile>;
	let dataSource: DataSource;
	let testUser: User;

	beforeAll(async () => {
		dataSource = await createTestDatabase([
			MediaFile,
			User,
			UserRole,
			Address,
			FlashCard,
			Collection,
			Topic,
		]);
		repository = dataSource.getRepository(MediaFile);

		const roleRepo = dataSource.getRepository(UserRole);
		const userRepo = dataSource.getRepository(User);

		const role = roleRepo.create(createUserRoleStub());
		await roleRepo.save(role);

		testUser = userRepo.create(createUserStub({ role }));
		await userRepo.save(testUser);
	});

	afterAll(async () => await closeTestDatabase(dataSource));
	beforeEach(() => resetIdCounter());
	afterEach(async () => await clearDatabase(dataSource, [MediaFile]));

	describe('create', () => {
		it('should create media file', async () => {
			const stub = createMediaFileStub({ uploadedBy: testUser });
			const result = await repository.save(stub);

			expect(result).toBeDefined();
			expect(result.id).toBeDefined();
			expect(result.status).toBe(MediaFileStatus.COMPLETED);
		});
	});

	describe('findAndCount', () => {
		it('should filter by status', async () => {
			await repository.save(
				createMediaFileStub({
					uploadedBy: testUser,
					status: MediaFileStatus.COMPLETED,
				}),
			);
			await repository.save(
				createMediaFileStub({
					uploadedBy: testUser,
					status: MediaFileStatus.PENDING,
				}),
			);

			const [items, count] = await repository.findAndCount({
				where: { status: MediaFileStatus.COMPLETED },
			});

			expect(count).toBe(1);
			expect(items[0].status).toBe(MediaFileStatus.COMPLETED);
		});

		it('should filter by mimetype', async () => {
			await repository.save(
				createMediaFileStub({
					uploadedBy: testUser,
					mimetype: 'image/jpeg',
				}),
			);

			const [, count] = await repository.findAndCount({
				where: { mimetype: 'image/jpeg' },
			});

			expect(count).toBe(1);
		});
	});
});
