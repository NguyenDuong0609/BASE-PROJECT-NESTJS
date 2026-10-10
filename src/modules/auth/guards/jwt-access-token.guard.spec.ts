import { ConfigService } from '@nestjs/config';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAccessTokenGuard } from './jwt-access-token.guard';

describe('JwtAccessTokenGuard', () => {
	let guard: JwtAccessTokenGuard;
	let reflector: jest.Mocked<Reflector>;
	let configService: jest.Mocked<ConfigService>;

	beforeEach(() => {
		reflector = {
			getAllAndOverride: jest.fn(),
		} as unknown as jest.Mocked<Reflector>;
		configService = {
			get: jest.fn().mockReturnValue([]),
		} as unknown as jest.Mocked<ConfigService>;
		guard = new JwtAccessTokenGuard(reflector, configService);
	});

	function context(request: Record<string, any>): ExecutionContext {
		return {
			switchToHttp: () => ({
				getRequest: () => request,
			}),
			getHandler: () => ({}),
			getClass: () => ({}),
		} as ExecutionContext;
	}

	it('allows public routes without invoking Passport', () => {
		reflector.getAllAndOverride.mockReturnValue(true);
		expect(guard.canActivate(context({ headers: {} }))).toBe(true);
	});

	it('rejects state-changing cookie-authenticated requests without an allowed origin', () => {
		reflector.getAllAndOverride.mockReturnValue(false);
		expect(() =>
			guard.canActivate(
				context({
					method: 'PATCH',
					headers: { cookie: 'access_token=token-value' },
				}),
			),
		).toThrow(ForbiddenException);
	});
});
