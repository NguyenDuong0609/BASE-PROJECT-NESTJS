import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from '@configs/configuration.config';
import { validationSchema } from '@configs/validation.schema';
import { UsersModule } from '@modules/users/users.module';
import { UserRolesModule } from '@modules/user-roles/user-roles.module';
import { AuthModule } from './modules/auth/auth.module';
import { QueueModule } from './modules/queue/queue.module';
import { MediaModule } from './modules/media/media.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { HealthController } from './health/health.controller';
import { ApiExceptionFilter } from './filters/api-exception.filter';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { FeatureFlagGuard } from './guards/feature-flag.guard';
import { MetricsModule } from './observability/metrics.module';
import { LoggerModule } from 'nestjs-pino';
import { loggerConfig } from '@configs/logger.config';
import { AppCacheModule } from '@modules/shared/base/cache/app-cache.module';
import { CsrfGuard } from './guards/csrf.guard';
import { RedisThrottlerOptionsFactory } from './observability/redis-throttler.storage';
import { AuditModule } from './modules/audit/audit.module';
import { DomainModulesModule } from './domains/domain-modules.module';
import { PermissionsModule } from './modules/permissions/permissions.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [configuration],
			validate: (config) => {
				const { error, value } = validationSchema.validate(config, {
					allowUnknown: true,
					abortEarly: false,
				});
				if (error) {
					throw error;
				}
				return value;
			},
			cache: true,
			expandVariables: true,
			envFilePath: process.env.NODE_ENV === 'development' ? '.env.dev' : '.env',
		}),
		LoggerModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) =>
				loggerConfig(
					configService.get<string>('app.environment'),
					configService.get<string>('LOG_LEVEL'),
					configService.get<string>('LOG_FORMAT'),
				),
		}),
		AppCacheModule,
		ThrottlerModule.forRootAsync({
			imports: [ConfigModule],
			useClass: RedisThrottlerOptionsFactory,
		}),
		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			useFactory: async (configService: ConfigService) => ({
				type: 'postgres',
				host: configService.get<string>('DB_HOST'),
				port: configService.get<number>('DB_PORT'),
				username: configService.get<string>('DB_USERNAME'),
				password: configService.get<string>('DB_PASSWORD'),
				database: configService.get<string>('DB_DATABASE'),
				autoLoadEntities: true,
				synchronize: false,
				extra: {
					max: configService.get<number>('DB_POOL_SIZE', 10),
					connectionTimeoutMillis: configService.get<number>(
						'DB_CONNECTION_TIMEOUT_MS',
						5000,
					),
					query_timeout: configService.get<number>(
						'DB_QUERY_TIMEOUT_MS',
						15000,
					),
				},
			}),
			inject: [ConfigService],
		}),
		UserRolesModule,
		PermissionsModule,
		UsersModule,
		DomainModulesModule,
		AuthModule,
		QueueModule,
		MediaModule,
		MetricsModule,
		AuditModule,
	],
	controllers: [AppController, HealthController],
	providers: [
		AppService,
		{
			provide: APP_GUARD,
			useClass: CsrfGuard,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: ResponseInterceptor,
		},
		{
			provide: APP_FILTER,
			useClass: ApiExceptionFilter,
		},
		{
			provide: APP_GUARD,
			useClass: ThrottlerGuard,
		},
		{
			provide: APP_GUARD,
			useClass: FeatureFlagGuard,
		},
	],
})
export class AppModule {}
