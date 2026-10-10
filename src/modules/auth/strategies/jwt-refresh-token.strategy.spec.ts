import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { AuthService } from '../auth.service';
import { JwtRefreshTokenStrategy } from './jwt-refresh-token.strategy';

describe('JwtRefreshTokenStrategy', () => {
	const secret = 'refresh-secret-for-tests';
	let strategy: JwtRefreshTokenStrategy;
	let authService: jest.Mocked<AuthService>;

	beforeEach(() => {
		authService = {
			getUserIfRefreshTokenMatched: jest.fn(),
		} as unknown as jest.Mocked<AuthService>;
		const config = {
			getOrThrow: jest.fn().mockReturnValue(secret),
		} as unknown as ConfigService;
		strategy = new JwtRefreshTokenStrategy(authService, config);
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

	it('rejects expired refresh tokens before looking up the user', async () => {
		const token = jwt.sign({ user_id: 'user-id' }, secret, {
			algorithm: 'HS256',
			expiresIn: -1,
		});

		const result = await authenticate(token);

		expect(result.failure?.name).toBe('TokenExpiredError');
		expect(authService.getUserIfRefreshTokenMatched).not.toHaveBeenCalled();
	});

	it('rejects a refresh token signed with a different key', async () => {
		const token = jwt.sign({ user_id: 'user-id' }, 'wrong-secret', {
			algorithm: 'HS256',
		});

		const result = await authenticate(token);

		expect(result.failure?.name).toBe('JsonWebTokenError');
		expect(authService.getUserIfRefreshTokenMatched).not.toHaveBeenCalled();
	});
});
