import { validationSchema } from './validation.schema';

describe('environment validation schema', () => {
	const requiredEnvironment = {
		NODE_ENV: 'test',
		DB_HOST: 'localhost',
		DB_USERNAME: 'test',
		DB_PASSWORD: 'test',
		DB_DATABASE: 'test',
		JWT_ACCESS_TOKEN_SECRET:
			'test-access-secret-that-is-at-least-32-characters',
		JWT_REFRESH_TOKEN_SECRET:
			'test-refresh-secret-that-is-at-least-32-characters',
		FRONTEND_URL: 'http://localhost:4200',
	};

	it('keeps sample domains and optional providers disabled by default', () => {
		const { error, value } = validationSchema.validate(requiredEnvironment, {
			allowUnknown: true,
			abortEarly: false,
		});

		expect(error).toBeUndefined();
		expect(value.ENABLE_FLASH_CARDS).toBe(false);
		expect(value.ENABLE_COLLECTIONS).toBe(false);
		expect(value.ENABLE_TOPICS).toBe(false);
		expect(value.ENABLE_CHECKIN).toBe(false);
		expect(value.ENABLE_COMMENTS).toBe(false);
		expect(value.ENABLE_FLASH_CARD_STATES).toBe(false);
		expect(value.ENABLE_ACCOUNT_EMAIL_FLOWS).toBe(false);
		expect(value.ENABLE_METRICS).toBe(false);
		expect(value.APP_CACHE_PREFIX).toBe('nestjs-base');
		expect(value.TRUST_PROXY_HOPS).toBe(0);
	});

	it('limits trusted proxy hops to a safe configured range', () => {
		const { error } = validationSchema.validate(
			{ ...requiredEnvironment, TRUST_PROXY_HOPS: 11 },
			{ allowUnknown: true, abortEarly: false },
		);
		expect(error?.details.map(({ path }) => path[0])).toContain(
			'TRUST_PROXY_HOPS',
		);
	});

	it('requires an application cache prefix safe for Redis key names', () => {
		const { error } = validationSchema.validate(
			{
				...requiredEnvironment,
				APP_CACHE_PREFIX: 'project cache',
			},
			{ allowUnknown: true, abortEarly: false },
		);

		expect(error?.details.map(({ path }) => path[0])).toContain(
			'APP_CACHE_PREFIX',
		);
	});

	it('applies production security requirements to staging', () => {
		const { error } = validationSchema.validate(
			{
				...requiredEnvironment,
				NODE_ENV: 'staging',
				JWT_ACCESS_TOKEN_SECRET:
					'change-me-staging-secret-which-is-at-least-32-chars',
				REDIS_PASSWORD: 'weak',
				SWAGGER_ENABLED: true,
			},
			{ allowUnknown: true, abortEarly: false },
		);

		expect(error?.details.map(({ path }) => path[0])).toEqual(
			expect.arrayContaining([
				'JWT_ACCESS_TOKEN_SECRET',
				'REDIS_PASSWORD',
				'FRONTEND_URL',
				'SWAGGER_ENABLED',
			]),
		);
	});

	it('requires SMTP host and sender when account email flows are enabled', () => {
		const { error } = validationSchema.validate(
			{
				...requiredEnvironment,
				ENABLE_ACCOUNT_EMAIL_FLOWS: true,
			},
			{ allowUnknown: true, abortEarly: false },
		);

		expect(error?.details.map(({ path }) => path[0])).toEqual(
			expect.arrayContaining(['SMTP_HOST', 'SMTP_FROM_EMAIL']),
		);
	});

	it('requires account email flows when email verification is enforced', () => {
		const { error } = validationSchema.validate(
			{
				...requiredEnvironment,
				REQUIRE_VERIFIED_EMAIL: true,
			},
			{ allowUnknown: true, abortEarly: false },
		);

		expect(error?.details.map(({ path }) => path[0])).toContain(
			'ENABLE_ACCOUNT_EMAIL_FLOWS',
		);
	});
});
