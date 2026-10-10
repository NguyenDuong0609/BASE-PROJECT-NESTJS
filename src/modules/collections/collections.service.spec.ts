import { ForbiddenException } from '@nestjs/common';
import { USER_ROLE } from '@modules/user-roles/entities/user-role.entity';
import { CollectionsService } from './collections.service';
import { CollectionRepositoryInterface } from './interfaces/collections.interface';
import { COLLECTION_LEVEL } from './entities/collection.entity';

describe('CollectionsService', () => {
	let service: CollectionsService;
	let repository: jest.Mocked<CollectionRepositoryInterface>;

	beforeEach(() => {
		repository = {
			findAll: jest.fn(),
			findOneById: jest.fn(),
			update: jest.fn(),
			softDelete: jest.fn(),
		} as unknown as jest.Mocked<CollectionRepositoryInterface>;
		service = new CollectionsService(repository);
	});

	it('denies access to another user’s private collection', async () => {
		repository.findOneById.mockResolvedValue({
			id: 'collection-id',
			is_public: false,
			user: { id: 'owner-id' },
		} as never);

		await expect(
			service.findOneForUser('collection-id', { id: 'other-user' } as never),
		).rejects.toBeInstanceOf(ForbiddenException);
	});

	it('prevents another user from updating a collection', async () => {
		repository.findOneById.mockResolvedValue({
			id: 'collection-id',
			user: { id: 'owner-id' },
		} as never);

		await expect(
			service.updateForUser('collection-id', {}, { id: 'other-user' } as never),
		).rejects.toBeInstanceOf(ForbiddenException);
		expect(repository.update).not.toHaveBeenCalled();
	});

	it('prevents another user from deleting a collection', async () => {
		repository.findOneById.mockResolvedValue({
			id: 'collection-id',
			user: { id: 'owner-id' },
		} as never);

		await expect(
			service.removeForUser('collection-id', { id: 'other-user' } as never),
		).rejects.toBeInstanceOf(ForbiddenException);
		expect(repository.softDelete).not.toHaveBeenCalled();
	});

	it('allows an admin to update another user’s collection', async () => {
		repository.findOneById.mockResolvedValue({
			id: 'collection-id',
			user: { id: 'owner-id' },
		} as never);
		repository.update.mockResolvedValue({ id: 'collection-id' } as never);

		await expect(
			service.updateForUser('collection-id', { name: 'updated' }, {
				id: 'admin-id',
				role: { name: USER_ROLE.ADMIN },
			} as never),
		).resolves.toEqual({ id: 'collection-id' });
	});

	it('applies level filters to public and owned collection results', async () => {
		repository.findAll.mockResolvedValue({ count: 0, items: [] } as never);

		await service.findAllForUser({ id: 'user-id' } as never, 0, 20, [
			COLLECTION_LEVEL.EASY,
			COLLECTION_LEVEL.HARD,
		]);

		const options = repository.findAll.mock.calls[0][0] as {
			where: Array<Record<string, unknown>>;
		};
		expect(options.where).toHaveLength(2);
		expect(options.where[0]).toHaveProperty('is_public', true);
		expect(options.where[1]).toHaveProperty('user', { id: 'user-id' });
		expect(options.where[0].level).toBe(options.where[1].level);
	});
});
