import { ConfigService } from '@nestjs/config';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { JwtRefreshTokenGuard } from './jwt-refresh-token.guard';

describe('JwtRefreshTokenGuard', () => {
	let guard: JwtRefreshTokenGuard;
	let configService: jest.Mocked<ConfigService>;

	beforeEach(() => {
		configService = {
			get: jest.fn().mockReturnValue([]),
		} as unknown as jest.Mocked<ConfigService>;
		guard = new JwtRefreshTokenGuard(configService);
	});

	it('rejects state-changing refresh-cookie requests without a trusted origin', () => {
		const context = {
			switchToHttp: () => ({
				getRequest: () => ({
					method: 'POST',
					headers: { cookie: 'refresh_token=token-value' },
				}),
			}),
		} as ExecutionContext;

		expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
	});
});
