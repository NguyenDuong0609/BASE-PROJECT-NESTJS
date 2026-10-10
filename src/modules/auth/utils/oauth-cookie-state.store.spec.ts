import { Request, Response } from 'express';
import { OAuthCookieStateStore } from './oauth-cookie-state.store';

describe('OAuthCookieStateStore', () => {
	let store: OAuthCookieStateStore;

	beforeEach(() => {
		store = new OAuthCookieStateStore(false);
	});

	it('stores an unpredictable state in an HttpOnly callback cookie', () => {
		const cookie = jest.fn();
		const request = { res: { cookie } } as unknown as Request;
		let state: string | undefined;

		store.store(request, (_error, value) => {
			state = value;
		});

		expect(state).toEqual(expect.any(String));
		expect(state).toHaveLength(43);
		expect(cookie).toHaveBeenCalledWith(
			'google_oauth_state',
			state,
			expect.objectContaining({
				httpOnly: true,
				sameSite: 'lax',
				path: '/auth/google/callback',
			}),
		);
	});

	it('accepts and consumes a matching state cookie', () => {
		const clearCookie = jest.fn();
		const request = {
			headers: { cookie: 'google_oauth_state=expected-state' },
			res: { clearCookie } as unknown as Response,
		} as Request;
		const callback = jest.fn();

		store.verify(request, 'expected-state', callback);

		expect(callback).toHaveBeenCalledWith(
			null,
			true,
			expect.objectContaining({ message: undefined }),
		);
		expect(clearCookie).toHaveBeenCalledWith(
			'google_oauth_state',
			expect.objectContaining({ path: '/auth/google/callback' }),
		);
	});

	it('rejects a missing or mismatched state cookie', () => {
		const request = {
			headers: { cookie: 'google_oauth_state=wrong-state' },
		} as Request;
		const callback = jest.fn();

		store.verify(request, 'expected-state', callback);

		expect(callback).toHaveBeenCalledWith(
			null,
			false,
			expect.objectContaining({
				message: 'Unable to verify authorization request state.',
			}),
		);
	});
});
