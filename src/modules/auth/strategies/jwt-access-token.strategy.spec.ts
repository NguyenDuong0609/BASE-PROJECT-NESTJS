import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { UsersService } from '@modules/users/users.service';
import { JwtAccessTokenStrategy } from './jwt-access-token.strategy';

describe('JwtAccessTokenStrategy', () => {
	const secret = 'access-secret-for-tests';
	let strategy: JwtAccessTokenStrategy;
	let usersService: jest.Mocked<UsersService>;
	let config: ConfigService;
	let getConfig: jest.Mock;

	beforeEach(() => {
		usersService = {
			getUserWithRole: jest.fn(),
		} as unknown as jest.Mocked<UsersService>;
		getConfig = jest.fn().mockReturnValue(false);
		config = {
			get: getConfig,
			getOrThrow: jest.fn().mockReturnValue(secret),
		} as unknown as ConfigService;
		strategy = new JwtAccessTokenStrategy(usersService, config);
	});

	async function authenticate(token: string): Promise<{ failure?: Error }> {
		return new Promise((resolve, reject) => {
			Object.assign(strategy, {
				fail: (error: Error) => resolve({ failure: error }),
				error: reject,
				success: () => resolve({}),
			});
			strategy.authenticate({
				headers: { authorization: `Bearer ${token}` },
			} as never);
		});
	}

	it('rejects expired access tokens', async () => {
		const token = jwt.sign({ user_id: 'user-id' }, secret, {
			algorithm: 'HS256',
			expiresIn: -1,
		});

		const result = await authenticate(token);

		expect(result.failure?.name).toBe('TokenExpiredError');
		expect(usersService.getUserWithRole).not.toHaveBeenCalled();
	});

	it('rejects a token signed with a different key', async () => {
		const token = jwt.sign({ user_id: 'user-id' }, 'wrong-secret', {
			algorithm: 'HS256',
		});

		const result = await authenticate(token);

		expect(result.failure?.name).toBe('JsonWebTokenError');
		expect(usersService.getUserWithRole).not.toHaveBeenCalled();
	});

	it('rejects unverified users when verification is required', async () => {
		getConfig.mockReturnValue(true);
		usersService.getUserWithRole.mockResolvedValue({
			id: 'user-id',
			isEmailVerified: false,
		} as never);

		await expect(strategy.validate({ user_id: 'user-id' })).rejects.toThrow(
			'Email verification is required',
		);
	});
});
