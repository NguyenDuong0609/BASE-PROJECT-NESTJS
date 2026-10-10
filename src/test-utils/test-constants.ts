/**
 * Shared test constants used across all test files
 */

/**
 * Test user credentials
 */
export const TEST_USER = {
	EMAIL: 'test@example.com',
	PASSWORD: 'Test123!@#',
	USERNAME: 'testuser',
	FIRST_NAME: 'Test',
	LAST_NAME: 'User',
};

/**
 * Test admin credentials
 */
export const TEST_ADMIN = {
	EMAIL: 'admin@example.com',
	PASSWORD: 'Admin123!@#',
	USERNAME: 'adminuser',
	FIRST_NAME: 'Admin',
	LAST_NAME: 'User',
};

/**
 * JWT tokens for testing
 */
export const TEST_TOKENS = {
	VALID_ACCESS_TOKEN: 'valid.access.token',
	VALID_REFRESH_TOKEN: 'valid.refresh.token',
	EXPIRED_ACCESS_TOKEN: 'expired.access.token',
	INVALID_TOKEN: 'invalid.token',
};

/**
 * Test database configuration
 */
export const TEST_DB_CONFIG = {
	TYPE: 'postgres' as const,
	HOST: 'localhost',
	PORT: 5432,
	USERNAME: 'test',
	PASSWORD: 'test',
	DATABASE: 'test_db',
	SYNCHRONIZE: true,
	LOGGING: false,
};

/**
 * Test AWS S3 configuration
 */
export const TEST_AWS_CONFIG = {
	REGION: 'us-east-1',
	BUCKET: 'test-bucket',
	ACCESS_KEY: 'test-access-key',
	SECRET_KEY: 'test-secret-key',
};

/**
 * Test Redis configuration
 */
export const TEST_REDIS_CONFIG = {
	HOST: 'localhost',
	PORT: 6379,
	PASSWORD: null,
};

/**
 * Test file upload limits
 */
export const TEST_FILE_LIMITS = {
	MAX_SIZE: 10 * 1024 * 1024, // 10MB
	ALLOWED_MIMETYPES: [
		'image/jpeg',
		'image/png',
		'image/gif',
		'application/pdf',
	],
};

/**
 * Test pagination defaults
 */
export const TEST_PAGINATION = {
	DEFAULT_LIMIT: 10,
	DEFAULT_OFFSET: 0,
	MAX_LIMIT: 100,
};

/**
 * Test date/time constants
 */
export const TEST_DATES = {
	NOW: new Date('2024-01-15T10:00:00Z'),
	YESTERDAY: new Date('2024-01-14T10:00:00Z'),
	TOMORROW: new Date('2024-01-16T10:00:00Z'),
	LAST_WEEK: new Date('2024-01-08T10:00:00Z'),
};

/**
 * Flash card state workflow states
 */
export const FLASH_CARD_STATES = {
	DRAFT: 'draft',
	IN_REVIEW: 'in_review',
	APPROVED_ONE: 'approved_one',
	APPROVED_TWO: 'approved_two',
	PUBLISHED: 'published',
} as const;

/**
 * User roles
 */
export const USER_ROLES = {
	ADMIN: 'Admin',
	USER: 'User',
	TEAM_LEADER: 'TeamLeader',
} as const;

/**
 * Test timeout values (milliseconds)
 */
export const TEST_TIMEOUTS = {
	SHORT: 1000,
	MEDIUM: 5000,
	LONG: 10000,
	VERY_LONG: 30000,
};

/**
 * Test error messages
 */
export const TEST_ERROR_MESSAGES = {
	UNAUTHORIZED: 'Unauthorized',
	FORBIDDEN: 'Forbidden',
	NOT_FOUND: 'Not Found',
	BAD_REQUEST: 'Bad Request',
	CONFLICT: 'Conflict',
	INTERNAL_SERVER_ERROR: 'Internal Server Error',
};

/**
 * Common test regex patterns
 */
export const TEST_PATTERNS = {
	UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
	EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
	JWT: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,
};
