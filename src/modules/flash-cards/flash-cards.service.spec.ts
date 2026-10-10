import { ForbiddenException } from '@nestjs/common';
import { USER_ROLE } from '@modules/user-roles/entities/user-role.entity';
import { User } from '@modules/users/entities/user.entity';
import { FlashCardsService } from './flash-cards.service';
import { FlashCardsRepositoryInterface } from './interfaces/flash-cards.interface';
import { FlashCard } from './entities/flash-card.entity';
import { AppCacheKeyBuilder } from '@modules/shared/base/cache/app-cache-key.builder';

describe('FlashCardsService', () => {
	let service: FlashCardsService;
	let repository: jest.Mocked<FlashCardsRepositoryInterface>;
	let cache: {
		getOrSet: jest.Mock;
		invalidate: jest.Mock;
	};

	beforeEach(() => {
		repository = {
			create: jest.fn(),
			findAll: jest.fn(),
			findOneById: jest.fn(),
			update: jest.fn(),
			softDelete: jest.fn(),
		} as unknown as jest.Mocked<FlashCardsRepositoryInterface>;
		cache = {
			getOrSet: jest.fn((_namespace, _key, _ttl, loader) => loader()),
			invalidate: jest.fn().mockResolvedValue(undefined),
		};
		service = new FlashCardsService(repository, cache as never);
	});

	it('scopes cached list results to the authenticated user and role', async () => {
		repository.findAll.mockResolvedValue({ count: 0, items: [] } as never);

		await service.findAllForUser({ id: 'user-a' } as never);
		await service.findAllForUser({ id: 'user-b' } as never);

		expect(cache.getOrSet).toHaveBeenNthCalledWith(
			1,
			'flash-cards',
			AppCacheKeyBuilder.build({
				route: '/flash-cards',
				scope: { userId: 'user-a', role: 'user' },
				query: {},
			}),
			30_000,
			expect.any(Function),
			expect.any(Function),
		);
		expect(cache.getOrSet).toHaveBeenNthCalledWith(
			2,
			'flash-cards',
			AppCacheKeyBuilder.build({
				route: '/flash-cards',
				scope: { userId: 'user-b', role: 'user' },
				query: {},
			}),
			30_000,
			expect.any(Function),
			expect.any(Function),
		);
	});

	it('invalidates flash-card caches after a successful create', async () => {
		const card = { id: 'card-id' };
		repository.create.mockResolvedValue(card as never);

		await expect(service.create(card)).resolves.toBe(card);

		expect(cache.invalidate).toHaveBeenCalledWith('flash-cards');
	});

	it('denies access to another user’s private flash card', async () => {
		repository.findOneById.mockResolvedValue({
			id: 'card-id',
			is_public: false,
			user: { id: 'owner-id' },
		} as never);

		await expect(
			service.findOneForUser('card-id', { id: 'other-user' } as never),
		).rejects.toMatchObject({
			status: 403,
			response: {
				errorCode: 'FLASH_CARD_ACCESS_DENIED',
				message: 'You cannot access this flash card',
			},
		});
		expect(cache.getOrSet).toHaveBeenCalledTimes(1);
	});

	it('scopes cached flash-card details to each authenticated user', async () => {
		repository.findOneById.mockResolvedValue({
			id: 'card-id',
			is_public: true,
			user: { id: 'owner-id' },
		} as never);

		await service.findOneForUser('card-id', { id: 'user-a' } as never);
		await service.findOneForUser('card-id', { id: 'user-b' } as never);

		expect(cache.getOrSet).toHaveBeenNthCalledWith(
			1,
			'flash-cards',
			AppCacheKeyBuilder.build({
				route: '/flash-cards/:id',
				params: { id: 'card-id' },
				scope: { userId: 'user-a', role: 'user' },
			}),
			30_000,
			expect.any(Function),
			expect.any(Function),
		);
		expect(cache.getOrSet).toHaveBeenNthCalledWith(
			2,
			'flash-cards',
			AppCacheKeyBuilder.build({
				route: '/flash-cards/:id',
				params: { id: 'card-id' },
				scope: { userId: 'user-b', role: 'user' },
			}),
			30_000,
			expect.any(Function),
			expect.any(Function),
		);
	});

	it('serializes cached entities without private user credentials', async () => {
		const user = Object.assign(new User(), {
			id: 'owner-id',
			first_name: 'Cache',
			last_name: 'Test',
			password: 'hashed-password',
			googleId: 'google-id',
			current_refresh_token: 'refresh-token',
			twoFactorAuthenticationSecret: 'totp-secret',
		});
		const card = Object.assign(new FlashCard(), {
			id: 'card-id',
			vocabulary: 'hello',
			is_public: true,
			user,
			topics: [],
		});
		repository.findOneById.mockResolvedValue(card);

		await service.findOneForUser('card-id', { id: 'owner-id' } as never);

		const serializer = cache.getOrSet.mock.calls[0][4] as (
			value: FlashCard,
		) => Record<string, unknown>;
		const payload = serializer(card);
		const cachedUser = payload.user as Record<string, unknown>;
		expect(cachedUser).not.toHaveProperty('password');
		expect(cachedUser).not.toHaveProperty('googleId');
		expect(cachedUser).not.toHaveProperty('current_refresh_token');
		expect(cachedUser).not.toHaveProperty('twoFactorAuthenticationSecret');
	});

	it('prevents another user from updating a flash card', async () => {
		repository.findOneById.mockResolvedValue({
			id: 'card-id',
			user: { id: 'owner-id' },
		} as never);

		await expect(
			service.updateForUser('card-id', {}, { id: 'other-user' } as never),
		).rejects.toBeInstanceOf(ForbiddenException);
		expect(repository.update).not.toHaveBeenCalled();
		expect(cache.invalidate).not.toHaveBeenCalled();
	});

	it('prevents another user from deleting a flash card', async () => {
		repository.findOneById.mockResolvedValue({
			id: 'card-id',
			user: { id: 'owner-id' },
		} as never);

		await expect(
			service.removeForUser('card-id', { id: 'other-user' } as never),
		).rejects.toBeInstanceOf(ForbiddenException);
		expect(repository.softDelete).not.toHaveBeenCalled();
		expect(cache.invalidate).not.toHaveBeenCalled();
	});

	it('invalidates flash-card caches after a successful delete', async () => {
		repository.findOneById.mockResolvedValue({
			id: 'card-id',
			user: { id: 'user-id' },
		} as never);
		repository.softDelete.mockResolvedValue(true);

		await expect(
			service.removeForUser('card-id', { id: 'user-id' } as never),
		).resolves.toBe(true);

		expect(cache.invalidate).toHaveBeenCalledWith('flash-cards');
	});

	it('allows an admin to update another user’s flash card', async () => {
		repository.findOneById.mockResolvedValue({
			id: 'card-id',
			user: { id: 'owner-id' },
		} as never);
		repository.update.mockResolvedValue({ id: 'card-id' } as never);

		await expect(
			service.updateForUser('card-id', { vocabulary: 'updated' }, {
				id: 'admin-id',
				role: { name: USER_ROLE.ADMIN },
			} as never),
		).resolves.toEqual({ id: 'card-id' });
		expect(cache.invalidate).toHaveBeenCalledWith('flash-cards');
	});
});
