import { ForbiddenException } from '@nestjs/common';
import { CsrfGuard } from './csrf.guard';

describe('CsrfGuard', () => {
	const config = {
		get: jest.fn((key: string) =>
			key === 'app.environment' ? 'production' : ['https://app.example.com'],
		),
	};
	let guard: CsrfGuard;

	beforeEach(() => {
		jest.clearAllMocks();
		guard = new CsrfGuard(config as never);
	});

	function context(request: Record<string, unknown>) {
		return {
			switchToHttp: () => ({ getRequest: () => request }),
		} as never;
	}

	it('allows safe requests without CSRF credentials', () => {
		expect(guard.canActivate(context({ method: 'GET', headers: {} }))).toBe(
			true,
		);
	});

	it('does not require CSRF for bearer-only requests', () => {
		expect(
			guard.canActivate(
				context({
					method: 'POST',
					headers: { authorization: 'Bearer access-token' },
				}),
			),
		).toBe(true);
	});

	it('rejects cross-origin cookie-authenticated writes', () => {
		expect(() =>
			guard.canActivate(
				context({
					method: 'POST',
					headers: {
						cookie: 'access_token=secret',
						origin: 'https://attacker.example',
					},
					get: () => 'api.example.com',
				}),
			),
		).toThrow(ForbiddenException);
	});

	it('requires a matching CSRF cookie and header for allowed origins', () => {
		expect(() =>
			guard.canActivate(
				context({
					method: 'PATCH',
					headers: {
						cookie: 'access_token=secret; __Host-csrf_token=token-1',
						origin: 'https://app.example.com',
						'x-csrf-token': 'token-2',
					},
					get: () => 'api.example.com',
				}),
			),
		).toThrow(ForbiddenException);
	});

	it('allows cookie-authenticated writes with a matching CSRF token', () => {
		expect(
			guard.canActivate(
				context({
					method: 'DELETE',
					headers: {
						cookie: 'access_token=secret; __Host-csrf_token=token-1',
						origin: 'https://app.example.com',
						'x-csrf-token': 'token-1',
					},
					get: () => 'api.example.com',
				}),
			),
		).toBe(true);
	});

	it('rejects duplicate CSRF cookies', () => {
		expect(() =>
			guard.canActivate(
				context({
					method: 'POST',
					headers: {
						cookie:
							'access_token=secret; __Host-csrf_token=a; __Host-csrf_token=a',
						origin: 'https://app.example.com',
						'x-csrf-token': 'a',
					},
					get: () => 'api.example.com',
				}),
			),
		).toThrow(ForbiddenException);
	});

	it('still requires CSRF when auth cookies are duplicated', () => {
		expect(() =>
			guard.canActivate(
				context({
					method: 'POST',
					headers: {
						cookie: 'access_token=; access_token=secret',
						origin: 'https://app.example.com',
					},
					get: () => 'api.example.com',
				}),
			),
		).toThrow(ForbiddenException);
	});
});
