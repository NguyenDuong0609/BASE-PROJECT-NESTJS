import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
	DatabaseConfig,
	RedisConfig,
	AwsConfig,
	GoogleConfig,
	JwtConfig,
	AppConfig,
	FrontendConfig,
	FileUploadConfig,
} from './configuration.config';

/**
 * Type-safe configuration service wrapper for ConfigService.
 * Provides strongly-typed access to all configuration values.
 *
 * @example
 * ```typescript
 * constructor(private readonly config: TypedConfigService) {}
 *
 * const dbHost = this.config.database.host;
 * const jwtSecret = this.config.jwt.accessTokenSecret;
 * ```
 */
@Injectable()
export class TypedConfigService {
	constructor(private readonly configService: ConfigService) {}

	/**
	 * Get application configuration
	 */
	get app(): AppConfig {
		return this.configService.get<AppConfig>('app');
	}

	/**
	 * Get database configuration
	 */
	get database(): DatabaseConfig {
		return this.configService.get<DatabaseConfig>('database');
	}

	/**
	 * Get Redis configuration
	 */
	get redis(): RedisConfig {
		return this.configService.get<RedisConfig>('redis');
	}

	/**
	 * Get AWS configuration
	 */
	get aws(): AwsConfig {
		return this.configService.get<AwsConfig>('aws');
	}

	/**
	 * Get Google OAuth configuration
	 */
	get google(): GoogleConfig {
		return this.configService.get<GoogleConfig>('google');
	}

	/**
	 * Get JWT configuration
	 */
	get jwt(): JwtConfig {
		return this.configService.get<JwtConfig>('jwt');
	}

	/**
	 * Get frontend configuration
	 */
	get frontend(): FrontendConfig {
		return this.configService.get<FrontendConfig>('frontend');
	}

	/**
	 * Get file upload configuration
	 */
	get fileUpload(): FileUploadConfig {
		return this.configService.get<FileUploadConfig>('fileUpload');
	}

	/**
	 * Check if running in production environment
	 */
	get isProduction(): boolean {
		return this.app.environment === 'production';
	}

	/**
	 * Check if running in development environment
	 */
	get isDevelopment(): boolean {
		return this.app.environment === 'development';
	}

	/**
	 * Check if running in test environment
	 */
	get isTest(): boolean {
		return this.app.environment === 'test';
	}
}
