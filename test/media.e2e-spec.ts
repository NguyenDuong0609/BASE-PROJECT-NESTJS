import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Media (e2e)', () => {
	let app: INestApplication;

	beforeAll(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();
		app = module.createNestApplication();
		await app.init();
	});

	afterAll(async () => {
		await app.close();
	});

	it('/media/upload (POST) rejects an unauthenticated request', () => {
		return request(app.getHttpServer())
			.post('/media/upload')
			.expect(401)
			.expect({
				statusCode: 401,
				message: 'Unauthorized',
				data: null,
				errors: null,
				errorCode: 'UNAUTHORIZED',
			});
	});
});
