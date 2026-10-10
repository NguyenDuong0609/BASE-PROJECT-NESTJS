import { createHmac } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '@modules/users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
	const refreshSecret = 'test-refresh-secret';
	let service: AuthService;
	let users: jest.Mocked<UsersService>;
	let jwt: jest.Mocked<JwtService>;
	let config: jest.Mocked<ConfigService>;

	beforeEach(() => {
		users = {
			setCurrentRefreshToken: jest.fn().mockResolvedValue(undefined),
			findOneByCondition: jest.fn(),
			consumeCurrentRefreshToken: jest.fn(),
		} as unknown as jest.Mocked<UsersService>;
		jwt = {
			sign: jest
				.fn()
				.mockReturnValueOnce('access-token')
				.mockReturnValueOnce('refresh-token'),
		} as unknown as jest.Mocked<JwtService>;
		config = {
			get: jest.fn().mockReturnValue(undefined),
			getOrThrow: jest.fn((key: string) =>
				key === 'jwt.refreshTokenSecret' ? refreshSecret : 'test-access-secret',
			),
		} as unknown as jest.Mocked<ConfigService>;
		service = new AuthService(config, users, jwt);
	});

	it('signs short-lived access tokens and stores only a refresh-token hash', async () => {
		await expect(service.signIn('user-id')).resolves.toEqual({
			access_token: 'access-token',
			refresh_token: 'refresh-token',
		});

		expect(jwt.sign).toHaveBeenNthCalledWith(
			1,
			{ user_id: 'user-id' },
			expect.objectContaining({
				algorithm: 'HS256',
				secret: 'test-access-secret',
				expiresIn: 15 * 60,
			}),
		);
		expect(users.setCurrentRefreshToken).toHaveBeenCalledWith(
			'user-id',
			createHmac('sha256', refreshSecret).update('refresh-token').digest('hex'),
		);
	});

	it('rejects malformed token expiration configuration', () => {
		config.get.mockReturnValueOnce('0s');

		expect(() => service.generateAccessToken({ user_id: 'user-id' })).toThrow(
			'JWT expiration must be a positive integer followed by s, m, h, d, w, or y',
		);
		expect(jwt.sign).not.toHaveBeenCalled();
	});

	it('consumes a matching refresh token exactly once', async () => {
		const refreshToken = 'valid-refresh-token';
		const tokenHash = createHmac('sha256', refreshSecret)
			.update(refreshToken)
			.digest('hex');
		const user = { id: 'user-id', current_refresh_token: tokenHash };
		users.findOneByCondition.mockResolvedValue(user as never);
		users.consumeCurrentRefreshToken.mockResolvedValue(true);

		await expect(
			service.getUserIfRefreshTokenMatched('user-id', refreshToken),
		).resolves.toBe(user);
		expect(users.consumeCurrentRefreshToken).toHaveBeenCalledWith(
			'user-id',
			tokenHash,
		);
	});

	it('rejects a replayed refresh token', async () => {
		const refreshToken = 'used-refresh-token';
		const tokenHash = createHmac('sha256', refreshSecret)
			.update(refreshToken)
			.digest('hex');
		users.findOneByCondition.mockResolvedValue({
			id: 'user-id',
			current_refresh_token: tokenHash,
		} as never);
		users.consumeCurrentRefreshToken.mockResolvedValue(false);

		await expect(
			service.getUserIfRefreshTokenMatched('user-id', refreshToken),
		).rejects.toBeInstanceOf(UnauthorizedException);
	});
});
