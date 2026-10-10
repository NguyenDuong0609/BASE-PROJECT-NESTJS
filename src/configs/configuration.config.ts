export interface DatabaseConfig {
	host: string;
	port: number;
	username: string;
	password: string;
	database: string;
	logging: boolean;
}

export interface RedisConfig {
	host: string;
	port: number;
	password?: string;
	db: number;
}

export interface AwsConfig {
	region: string;
	accessKeyId: string;
	secretAccessKey: string;
	s3: {
		bucket: string;
	};
}

export interface GoogleConfig {
	clientId: string;
	clientSecret: string;
	callbackUrl: string;
}

export interface JwtConfig {
	accessTokenSecret: string;
	accessTokenExpiration: string;
	refreshTokenSecret: string;
	refreshTokenExpiration: string;
}

export interface AppConfig {
	port: number;
	environment: string;
}

export interface FrontendConfig {
	url: string;
}

export interface FileUploadConfig {
	maxFileSize: number;
	allowedFileTypes: string[];
}

export default () => ({
	app: {
		port: parseInt(process.env.PORT, 10) || 3000,
		environment: process.env.NODE_ENV || 'development',
		trustProxyHops: parseInt(process.env.TRUST_PROXY_HOPS, 10) || 0,
	} as AppConfig,
	cors: {
		origins: (process.env.CORS_ORIGINS || '')
			.split(',')
			.map((origin) => origin.trim())
			.filter(Boolean),
	},
	swagger: {
		enabled: process.env.SWAGGER_ENABLED === 'true',
		username: process.env.SWAGGER_USERNAME,
		password: process.env.SWAGGER_PASSWORD,
	},
	database: {
		host: process.env.DB_HOST,
		port: parseInt(process.env.DB_PORT, 10),
		username: process.env.DB_USERNAME,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_DATABASE,
		logging: process.env.DB_LOGGING === 'true',
	} as DatabaseConfig,
	redis: {
		host: process.env.REDIS_HOST || 'localhost',
		port: parseInt(process.env.REDIS_PORT, 10) || 6379,
		password: process.env.REDIS_PASSWORD || undefined,
		db: parseInt(process.env.REDIS_DB, 10) || 0,
	} as RedisConfig,
	cache: {
		prefix: process.env.APP_CACHE_PREFIX || 'nestjs-base',
	},
	aws: {
		region: process.env.AWS_REGION || 'us-east-1',
		accessKeyId: process.env.AWS_ACCESS_KEY_ID,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
		s3: {
			bucket: process.env.AWS_S3_BUCKET,
		},
	} as AwsConfig,
	features: {
		s3: process.env.ENABLE_S3 === 'true',
		googleOAuth: process.env.ENABLE_GOOGLE_OAUTH === 'true',
		flashCards: process.env.ENABLE_FLASH_CARDS === 'true',
		collections: process.env.ENABLE_COLLECTIONS === 'true',
		topics: process.env.ENABLE_TOPICS === 'true',
		checkin: process.env.ENABLE_CHECKIN === 'true',
		comments: process.env.ENABLE_COMMENTS === 'true',
		flashCardStates: process.env.ENABLE_FLASH_CARD_STATES === 'true',
		metrics: process.env.ENABLE_METRICS === 'true',
		twoFactor: process.env.ENABLE_TWO_FACTOR === 'true',
		accountEmailFlows: process.env.ENABLE_ACCOUNT_EMAIL_FLOWS === 'true',
		studentCardUploads: process.env.ENABLE_STUDENT_CARD_UPLOADS === 'true',
	},
	mail: {
		host: process.env.SMTP_HOST,
		port: parseInt(process.env.SMTP_PORT, 10) || 587,
		secure: process.env.SMTP_SECURE === 'true',
		user: process.env.SMTP_USER,
		password: process.env.SMTP_PASSWORD,
		from: process.env.SMTP_FROM_EMAIL,
		fromName: process.env.SMTP_FROM_NAME || 'Application',
	},
	auth: {
		requireVerifiedEmail: process.env.REQUIRE_VERIFIED_EMAIL === 'true',
	},
	audit: {
		retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS, 10) || 0,
	},
	google: {
		clientId: process.env.GOOGLE_CLIENT_ID,
		clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		callbackUrl: process.env.GOOGLE_CALLBACK_URL,
	} as GoogleConfig,
	jwt: {
		accessTokenSecret: process.env.JWT_ACCESS_TOKEN_SECRET,
		accessTokenExpiration: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '15m',
		refreshTokenSecret: process.env.JWT_REFRESH_TOKEN_SECRET,
		refreshTokenExpiration: process.env.JWT_REFRESH_TOKEN_EXPIRATION || '7d',
	} as JwtConfig,
	twoFactor: {
		encryptionKey: process.env.TWO_FACTOR_ENCRYPTION_KEY,
	},
	frontend: {
		url: process.env.FRONTEND_URL || 'http://localhost:4200',
	} as FrontendConfig,
	fileUpload: {
		maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10485760, // 10MB default
		allowedFileTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
			'image/jpeg',
			'image/png',
			'image/gif',
			'application/pdf',
		],
	} as FileUploadConfig,
});
