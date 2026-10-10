import { DataSource, Repository } from 'typeorm';
import { Comment } from '../entities/comment.entity';
import { CommentClosure } from '../entities/comment-closure.entity';
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
	createCommentStub,
	createUserStub,
	createUserRoleStub,
	resetIdCounter,
} from '@test-utils';

describe('CommentsRepository', () => {
	let repository: Repository<Comment>;
	let dataSource: DataSource;
	let testUser: User;

	beforeAll(async () => {
		dataSource = await createTestDatabase([
			Comment,
			CommentClosure,
			User,
			UserRole,
			Address,
			FlashCard,
			Collection,
			Topic,
		]);
		repository = dataSource.getRepository(Comment);

		const roleRepo = dataSource.getRepository(UserRole);
		const userRepo = dataSource.getRepository(User);

		const role = roleRepo.create(createUserRoleStub());
		await roleRepo.save(role);

		testUser = userRepo.create(createUserStub({ role }));
		await userRepo.save(testUser);
	}, 30_000);

	afterAll(async () => await closeTestDatabase(dataSource));
	beforeEach(() => resetIdCounter());
	afterEach(async () => await clearDatabase(dataSource, [Comment]));

	describe('create', () => {
		it('should create root comment', async () => {
			const stub = createCommentStub({ author: testUser, depth: 0 });
			const result = await repository.save(stub);

			expect(result).toBeDefined();
			expect(result.depth).toBe(0);
		});

		it('should create reply with depth', async () => {
			const stub = createCommentStub({ author: testUser, depth: 1 });
			const result = await repository.save(stub);

			expect(result.depth).toBe(1);
		});
	});

	describe('findAndCount', () => {
		it('should find by post id', async () => {
			await repository.save(
				createCommentStub({ author: testUser, postId: 'post-1' }),
			);
			await repository.save(
				createCommentStub({ author: testUser, postId: 'post-1' }),
			);

			const [items, count] = await repository.findAndCount({
				where: { postId: 'post-1' },
			});

			expect(count).toBe(2);
			expect(items).toHaveLength(2);
		});

		it('should load author relations', async () => {
			const comment = await repository.save(
				createCommentStub({ author: testUser }),
			);

			const result = await repository.findOne({
				where: { id: comment.id },
				relations: ['author'],
			});

			expect(result.author).toBeDefined();
			expect(result.author.id).toBe(testUser.id);
		});
	});
});
