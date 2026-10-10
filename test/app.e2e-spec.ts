import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
	let app: INestApplication;

	beforeEach(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		await app.init();
	});

	afterEach(async () => {
		await app.close();
	});

	it('/ (GET)', () => {
		return request(app.getHttpServer()).get('/').expect(200).expect({
			statusCode: 200,
			message: 'Success',
			data: 'Hello World!',
			errors: null,
			errorCode: null,
		});
	});

	it('returns the server-generated request ID in the response header', () => {
		return request(app.getHttpServer())
			.get('/')
			.expect(200)
			.expect('x-request-id', /^[0-9a-f-]{36}$/i);
	});
});
