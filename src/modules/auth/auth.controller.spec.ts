import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuditLogService } from '../../observability/audit-log.service';
import { TwoFactorAuthService } from './two-factor-auth.service';

describe('AuthController', () => {
	let controller: AuthController;
	let authService: jest.Mocked<AuthService>;
	let accountLifecycle: {
		requestPasswordReset: jest.Mock;
		resetPassword: jest.Mock;
		requestEmailVerification: jest.Mock;
		verifyEmail: jest.Mock;
	};
	let auditLog: jest.Mocked<AuditLogService>;

	beforeEach(() => {
		authService = {
			signUp: jest.fn(),
			signIn: jest.fn(),
			logout: jest.fn(),
			loginWithGoogle: jest.fn(),
			getAccessTokenExpirationSeconds: jest.fn().mockReturnValue(900),
			getRefreshTokenExpirationSeconds: jest.fn().mockReturnValue(604800),
		} as unknown as jest.Mocked<AuthService>;
		accountLifecycle = {
			requestPasswordReset: jest.fn(),
			resetPassword: jest.fn(),
			requestEmailVerification: jest.fn(),
			verifyEmail: jest.fn(),
		};
		auditLog = {
			record: jest.fn().mockResolvedValue(undefined),
		} as unknown as jest.Mocked<AuditLogService>;
		const config = {
			get: jest.fn((key: string) =>
				key === 'app.environment' ? 'test' : false,
			),
			getOrThrow: jest.fn().mockReturnValue('https://frontend.invalid'),
		} as unknown as ConfigService;
		controller = new AuthController(
			authService,
			config,
			accountLifecycle as never,
			auditLog,
			{
				verifyUserCode: jest.fn(),
				turnOnTwoFactorAuthentication: jest.fn(),
				turnOffTwoFactorAuthentication: jest.fn(),
				generateTwoFactorAuthenticationSecret: jest.fn(),
			} as unknown as TwoFactorAuthService,
		);
	});

	it('delegates sign-up to the authentication service', async () => {
		const dto = { email: 'user@example.com', password: 'StrongPass1!' };
		authService.signUp.mockResolvedValue({
			access_token: 'access-token',
			refresh_token: 'refresh-token',
		} as never);

		await expect(controller.signUp(dto as never)).resolves.toEqual({
			access_token: 'access-token',
			refresh_token: 'refresh-token',
		});
		expect(authService.signUp).toHaveBeenCalledWith(dto);
	});

	it('rotates refresh tokens and sets secure HttpOnly cookies', async () => {
		authService.signIn.mockResolvedValue({
			access_token: 'access-token',
			refresh_token: 'refresh-token',
		});
		const response = { cookie: jest.fn() };

		await controller.refreshAccessToken(
			{ user: { id: 'user-id' } } as never,
			response as never,
		);

		expect(authService.signIn).toHaveBeenCalledWith('user-id');
		expect(response.cookie).toHaveBeenNthCalledWith(
			1,
			'access_token',
			'access-token',
			expect.objectContaining({ httpOnly: true, secure: false }),
		);
		expect(response.cookie).toHaveBeenNthCalledWith(
			2,
			'refresh_token',
			'refresh-token',
			expect.objectContaining({
				httpOnly: true,
				secure: false,
				maxAge: 604800000,
			}),
		);
		expect(response.cookie).toHaveBeenNthCalledWith(
			1,
			'access_token',
			'access-token',
			expect.objectContaining({ maxAge: 900000 }),
		);
	});

	it('clears auth cookies when logging out', async () => {
		authService.logout.mockResolvedValue(undefined);
		const response = { clearCookie: jest.fn() };

		await controller.logout(
			{ user: { id: 'user-id' } } as never,
			response as never,
		);

		expect(authService.logout).toHaveBeenCalledWith('user-id');
		expect(response.clearCookie).toHaveBeenCalledTimes(3);
		expect(auditLog.record).toHaveBeenCalledWith(
			'AUTH_LOGOUT',
			'user-id',
			'user-id',
		);
	});

	it('issues a browser-readable CSRF cookie and response token', () => {
		const response = { cookie: jest.fn() };

		const result = controller.getCsrfToken(response as never);

		expect(result.csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(response.cookie).toHaveBeenCalledWith(
			'csrf_token',
			result.csrfToken,
			expect.objectContaining({ httpOnly: false, path: '/' }),
		);
	});
});
