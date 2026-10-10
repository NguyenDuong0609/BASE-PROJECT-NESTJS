import * as Joi from 'joi';

export const validationSchema = Joi.object({
	// Application
	NODE_ENV: Joi.string()
		.valid('development', 'staging', 'production', 'test')
		.default('development'),
	PORT: Joi.number().default(3000),
	TRUST_PROXY_HOPS: Joi.number().integer().min(0).max(10).default(0),
	LOG_LEVEL: Joi.string()
		.valid('fatal', 'error', 'warn', 'info', 'debug', 'trace')
		.optional(),
	LOG_FORMAT: Joi.string().valid('pretty', 'json').default('pretty'),
	CORS_ORIGINS: Joi.string()
		.allow('')
		.default('')
		.custom((value, helpers) => {
			const origins = value.split(',').map((origin: string) => origin.trim());
			if (
				origins.some((origin: string) => {
					if (!origin) return false;
					try {
						const parsed = new URL(origin);
						return (
							origin === '*' ||
							!['http:', 'https:'].includes(parsed.protocol) ||
							parsed.origin !== origin
						);
					} catch {
						return true;
					}
				})
			) {
				return helpers.error('any.invalid');
			}
			return value;
		}),
	SWAGGER_ENABLED: Joi.boolean().default(false),
	SWAGGER_USERNAME: Joi.string().when('SWAGGER_ENABLED', {
		is: true,
		then: Joi.required(),
		otherwise: Joi.string().allow('').optional(),
	}),
	SWAGGER_PASSWORD: Joi.string()
		.min(16)
		.when('SWAGGER_ENABLED', {
			is: true,
			then: Joi.required(),
			otherwise: Joi.string().allow('').optional(),
		}),
	ENABLE_GOOGLE_OAUTH: Joi.boolean().default(false),
	ENABLE_S3: Joi.boolean().default(false),
	ENABLE_FLASH_CARDS: Joi.boolean().default(false),
	ENABLE_COLLECTIONS: Joi.boolean().default(false),
	ENABLE_TOPICS: Joi.boolean().default(false),
	ENABLE_CHECKIN: Joi.boolean().default(false),
	ENABLE_COMMENTS: Joi.boolean().default(false),
	ENABLE_FLASH_CARD_STATES: Joi.boolean().default(false),
	ENABLE_METRICS: Joi.boolean().default(false),
	ENABLE_TWO_FACTOR: Joi.boolean().default(false),
	TWO_FACTOR_ENCRYPTION_KEY: Joi.string()
		.pattern(/^[a-fA-F0-9]{64}$/)
		.when('ENABLE_TWO_FACTOR', {
			is: true,
			then: Joi.required(),
			otherwise: Joi.string().allow('').optional(),
		}),
	AUDIT_RETENTION_DAYS: Joi.number().integer().min(0).max(36500).default(0),
	ENABLE_PGAUDIT: Joi.boolean().default(false),
	ENABLE_ACCOUNT_EMAIL_FLOWS: Joi.boolean()
		.default(false)
		.when('REQUIRE_VERIFIED_EMAIL', {
			is: true,
			then: Joi.boolean().valid(true).required(),
		}),
	ENABLE_STUDENT_CARD_UPLOADS: Joi.boolean().default(false),
	REQUIRE_VERIFIED_EMAIL: Joi.boolean().default(false),
	SMTP_HOST: Joi.string().when('ENABLE_ACCOUNT_EMAIL_FLOWS', {
		is: true,
		then: Joi.required(),
		otherwise: Joi.string().allow('').optional(),
	}),
	SMTP_PORT: Joi.number().integer().min(1).max(65535).default(587),
	SMTP_SECURE: Joi.boolean().default(false),
	SMTP_USER: Joi.string().allow('').optional(),
	SMTP_PASSWORD: Joi.string().allow('').optional(),
	SMTP_FROM_EMAIL: Joi.string()
		.email()
		.when('ENABLE_ACCOUNT_EMAIL_FLOWS', {
			is: true,
			then: Joi.required(),
			otherwise: Joi.string().allow('').optional(),
		}),
	SMTP_FROM_NAME: Joi.string().default('Application'),

	// Database
	DB_HOST: Joi.string().required(),
	DB_PORT: Joi.number().default(5432),
	DB_USERNAME: Joi.string().required(),
	DB_PASSWORD: Joi.string().required(),
	DB_DATABASE: Joi.string().required(),
	DB_LOGGING: Joi.boolean().default(false),
	DB_POOL_SIZE: Joi.number().integer().min(1).max(100).default(10),
	DB_CONNECTION_TIMEOUT_MS: Joi.number().integer().min(100).default(5000),
	DB_QUERY_TIMEOUT_MS: Joi.number().integer().min(100).default(15000),

	// Redis
	REDIS_HOST: Joi.string().default('localhost'),
	REDIS_PORT: Joi.number().default(6379),
	REDIS_PASSWORD: Joi.string().allow('').optional(),
	REDIS_DB: Joi.number().default(0),
	APP_CACHE_PREFIX: Joi.string()
		.pattern(/^[a-zA-Z0-9:_-]+$/)
		.default('nestjs-base'),

	// AWS
	AWS_REGION: Joi.string().when('ENABLE_S3', {
		is: true,
		then: Joi.required(),
		otherwise: Joi.string().allow('').optional(),
	}),
	AWS_ACCESS_KEY_ID: Joi.string().allow('').optional(),
	AWS_SECRET_ACCESS_KEY: Joi.string().allow('').optional(),
	AWS_S3_BUCKET: Joi.string().when('ENABLE_S3', {
		is: true,
		then: Joi.required(),
		otherwise: Joi.string().allow('').optional(),
	}),

	// Google OAuth
	GOOGLE_CLIENT_ID: Joi.string().when('ENABLE_GOOGLE_OAUTH', {
		is: true,
		then: Joi.required(),
		otherwise: Joi.string().allow('').optional(),
	}),
	GOOGLE_CLIENT_SECRET: Joi.string().when('ENABLE_GOOGLE_OAUTH', {
		is: true,
		then: Joi.required(),
		otherwise: Joi.string().allow('').optional(),
	}),
	GOOGLE_CALLBACK_URL: Joi.string()
		.uri()
		.when('ENABLE_GOOGLE_OAUTH', {
			is: true,
			then: Joi.required(),
			otherwise: Joi.string().allow('').optional(),
		}),

	// JWT
	JWT_ACCESS_TOKEN_SECRET: Joi.string().min(32).required(),
	JWT_ACCESS_TOKEN_EXPIRATION: Joi.string()
		.pattern(/^[1-9]\d*[smhdwy]$/)
		.default('15m'),
	JWT_REFRESH_TOKEN_SECRET: Joi.string().min(32).required(),
	JWT_REFRESH_TOKEN_EXPIRATION: Joi.string()
		.pattern(/^[1-9]\d*[smhdwy]$/)
		.default('7d'),

	// Frontend
	FRONTEND_URL: Joi.string().uri().required(),

	// File Upload
	MAX_FILE_SIZE: Joi.number().integer().min(1).max(104857600).default(10485760),
	ALLOWED_FILE_TYPES: Joi.string().optional(),
})
	.when(
		Joi.object({
			NODE_ENV: Joi.string().valid('staging', 'production'),
		}).unknown(),
		{
			then: Joi.object({
				JWT_ACCESS_TOKEN_SECRET: Joi.string()
					.min(32)
					.max(512)
					.custom(rejectCommonSecretPlaceholders)
					.required(),
				JWT_REFRESH_TOKEN_SECRET: Joi.string()
					.min(32)
					.max(512)
					.custom(rejectCommonSecretPlaceholders)
					.required(),
				REDIS_PASSWORD: Joi.string()
					.min(16)
					.pattern(/^[A-Za-z0-9_-]+$/)
					.required(),
				FRONTEND_URL: Joi.string()
					.uri({ scheme: ['https'] })
					.required(),
				SWAGGER_ENABLED: Joi.valid(false).default(false),
			}),
		},
	)
	.with('AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY')
	.with('AWS_SECRET_ACCESS_KEY', 'AWS_ACCESS_KEY_ID')
	.with('SMTP_USER', 'SMTP_PASSWORD')
	.with('SMTP_PASSWORD', 'SMTP_USER')
	.when(Joi.object({ REQUIRE_VERIFIED_EMAIL: Joi.valid(true) }).unknown(), {
		then: Joi.object({ ENABLE_ACCOUNT_EMAIL_FLOWS: Joi.valid(true) }),
	});

function rejectCommonSecretPlaceholders(
	value: string,
	helpers: Joi.CustomHelpers,
): string | Joi.ErrorReport {
	if (/^(change[-_ ]?me|your[-_ ]|example|replace[-_ ]|default)/i.test(value)) {
		return helpers.error('any.invalid');
	}
	return value;
}
