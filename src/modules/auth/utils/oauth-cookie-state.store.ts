import { randomBytes, timingSafeEqual } from 'crypto';
import { Request } from 'express';
import {
	Metadata,
	StateStore,
	StateStoreStoreCallback,
	StateStoreVerifyCallback,
} from 'passport-oauth2';
import { extractCookieToken } from './cookie-token.extractor';

const OAUTH_STATE_COOKIE = 'google_oauth_state';
const OAUTH_CALLBACK_PATH = '/auth/google/callback';
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;

export class OAuthCookieStateStore implements StateStore {
	constructor(private readonly secure: boolean) {}

	store(req: Request, callback: StateStoreStoreCallback): void;
	store(req: Request, meta: Metadata, callback: StateStoreStoreCallback): void;
	store(
		req: Request,
		metaOrCallback: Metadata | StateStoreStoreCallback,
		callback?: StateStoreStoreCallback,
	): void {
		const done =
			typeof metaOrCallback === 'function' ? metaOrCallback : callback;
		const response = req.res;
		if (!done || !response) {
			done?.(new Error('OAuth response is unavailable'), undefined);
			return;
		}

		const state = randomBytes(32).toString('base64url');
		response.cookie(OAUTH_STATE_COOKIE, state, {
			httpOnly: true,
			secure: this.secure,
			sameSite: 'lax',
			path: OAUTH_CALLBACK_PATH,
			maxAge: OAUTH_STATE_MAX_AGE_MS,
		});
		done(null, state);
	}

	verify(req: Request, state: string, callback: StateStoreVerifyCallback): void;
	verify(
		req: Request,
		state: string,
		meta: Metadata,
		callback: StateStoreVerifyCallback,
	): void;
	verify(
		req: Request,
		state: string,
		metaOrCallback: Metadata | StateStoreVerifyCallback,
		callback?: StateStoreVerifyCallback,
	): void {
		const done =
			typeof metaOrCallback === 'function' ? metaOrCallback : callback;
		if (!done) return;

		const expectedState = extractCookieToken(req, OAUTH_STATE_COOKIE);
		req.res?.clearCookie(OAUTH_STATE_COOKIE, {
			httpOnly: true,
			secure: this.secure,
			sameSite: 'lax',
			path: OAUTH_CALLBACK_PATH,
		});

		const matches =
			!!state &&
			!!expectedState &&
			Buffer.byteLength(state) === Buffer.byteLength(expectedState) &&
			timingSafeEqual(Buffer.from(state), Buffer.from(expectedState));
		done(null, matches, {
			message: matches
				? undefined
				: 'Unable to verify authorization request state.',
		});
	}
}
