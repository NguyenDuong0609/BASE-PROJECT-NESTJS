import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccountLifecycleService } from './account-lifecycle.service';
import { AuditLogService } from '../../observability/audit-log.service';
import { TwoFactorAuthService } from './two-factor-auth.service';

describe('AuthController throttling', () => {
	let app: INestApplication;
	const authService = {
		signUp: jest.fn().mockResolvedValue({ access_token: 'token' }),
	};
	const accountLifecycle = {};
	const auditLog = {};

	beforeAll(async () => {
		const module = await Test.createTestingModule({
			imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])],
			controllers: [AuthController],
			providers: [
				{ provide: AuthService, useValue: authService },
				{ provide: AccountLifecycleService, useValue: accountLifecycle },
				{ provide: AuditLogService, useValue: auditLog },
				{ provide: TwoFactorAuthService, useValue: {} },
				{
					provide: ConfigService,
					useValue: { get: jest.fn(), getOrThrow: jest.fn() },
				},
				{ provide: APP_GUARD, useClass: ThrottlerGuard },
			],
		}).compile();
		app = module.createNestApplication();
		await app.init();
	});

	afterAll(async () => {
		await app.close();
	});

	it('returns 429 after the configured auth request limit is exceeded', async () => {
		const server = app.getHttpServer();
		const payload = {
			email: 'user@example.com',
			password: 'StrongPassword123!',
		};

		for (let attempt = 0; attempt < 5; attempt += 1) {
			await request(server).post('/auth/sign-up').send(payload).expect(201);
		}
		await request(server).post('/auth/sign-up').send(payload).expect(429);
		expect(authService.signUp).toHaveBeenCalledTimes(5);
	});
});
