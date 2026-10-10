import {
	Body,
	Controller,
	Get,
	INestApplication,
	Post,
	ForbiddenException,
	ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { IsEmail, IsString, MinLength } from 'class-validator';
import request from 'supertest';
import { ApiExceptionFilter } from '../filters/api-exception.filter';
import { ResponseInterceptor } from '../interceptors/response.interceptor';
import { ApiException } from './api-errors';
import { ApiSuccessMessage } from 'src/decorators/api-success-message.decorator';

class CreateAccountRequest {
	@IsEmail()
	email: string;

	@IsString()
	@MinLength(8)
	password: string;
}

@Controller('response-contract')
class ApiResponseContractController {
	@Post()
	@ApiSuccessMessage('USER_REGISTERED')
	create(@Body() body: CreateAccountRequest) {
		return { email: body.email };
	}

	@Get('forbidden')
	forbidden() {
		throw new ApiException('FLASH_CARD_ACCESS_DENIED');
	}

	@Get('standard-forbidden')
	standardForbidden() {
		throw new ForbiddenException('Account is suspended');
	}
}

describe('API response contract (HTTP)', () => {
	let app: INestApplication;

	beforeAll(async () => {
		const module = await Test.createTestingModule({
			controllers: [ApiResponseContractController],
		}).compile();
		app = module.createNestApplication();
		app.useGlobalPipes(
			new ValidationPipe({
				whitelist: true,
				forbidNonWhitelisted: true,
				transform: true,
			}),
		);
		app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
		app.useGlobalFilters(new ApiExceptionFilter());
		await app.init();
	});

	afterAll(async () => {
		await app.close();
	});

	it('returns the standard envelope for successful API requests', async () => {
		await request(app.getHttpServer())
			.post('/response-contract')
			.send({ email: 'user@example.com', password: 'a-secure-password' })
			.expect(201)
			.expect({
				statusCode: 201,
				message: 'Account created successfully',
				data: { email: 'user@example.com' },
				errors: null,
				errorCode: null,
			});
	});

	it('returns the standard envelope for DTO validation failures', async () => {
		const response = await request(app.getHttpServer())
			.post('/response-contract')
			.send({ email: 'not-an-email', password: 'short', extra: true })
			.expect(400);

		expect(response.body).toEqual({
			statusCode: 400,
			message: 'Validation failed',
			data: null,
			errors: expect.arrayContaining([
				'email must be an email',
				'password must be longer than or equal to 8 characters',
				'property extra should not exist',
			]),
			errorCode: 'VALIDATION_FAILED',
		});
	});

	it('returns catalog error codes and messages for custom application errors', async () => {
		await request(app.getHttpServer())
			.get('/response-contract/forbidden')
			.expect(403)
			.expect({
				statusCode: 403,
				message: 'You cannot access this flash card',
				data: null,
				errors: null,
				errorCode: 'FLASH_CARD_ACCESS_DENIED',
			});
	});

	it('maps standard NestJS exceptions to stable codes', async () => {
		await request(app.getHttpServer())
			.get('/response-contract/standard-forbidden')
			.expect(403)
			.expect({
				statusCode: 403,
				message: 'Account is suspended',
				data: null,
				errors: null,
				errorCode: 'FORBIDDEN',
			});
	});
});
