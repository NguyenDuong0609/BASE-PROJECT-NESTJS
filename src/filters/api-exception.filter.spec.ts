import {
	ArgumentsHost,
	BadRequestException,
	ForbiddenException,
	InternalServerErrorException,
	NotFoundException,
	ServiceUnavailableException,
} from '@nestjs/common';
import { ApiExceptionFilter } from './api-exception.filter';
import { ApiException } from '../shared/api-errors';

describe('ApiExceptionFilter', () => {
	let filter: ApiExceptionFilter;
	let response: { status: jest.Mock; json: jest.Mock };

	beforeEach(() => {
		filter = new ApiExceptionFilter();
		response = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};
	});

	function createHost(): ArgumentsHost {
		return {
			switchToHttp: () => ({
				getRequest: () => ({ method: 'GET', url: '/resource' }),
				getResponse: () => response,
			}),
		} as unknown as ArgumentsHost;
	}

	it('formats standard HTTP errors with status and message', () => {
		filter.catch(new NotFoundException('Record not found'), createHost());

		expect(response.status).toHaveBeenCalledWith(404);
		expect(response.json).toHaveBeenCalledWith({
			statusCode: 404,
			message: 'Record not found',
			data: null,
			errors: null,
			errorCode: 'NOT_FOUND',
		});
	});

	it('maps standard NestJS exceptions to stable codes while preserving their message', () => {
		filter.catch(
			new ForbiddenException('Access is restricted for this account'),
			createHost(),
		);

		expect(response.status).toHaveBeenCalledWith(403);
		expect(response.json).toHaveBeenCalledWith({
			statusCode: 403,
			message: 'Access is restricted for this account',
			data: null,
			errors: null,
			errorCode: 'FORBIDDEN',
		});
	});

	it('returns validation messages in the standard errors field', () => {
		filter.catch(
			new BadRequestException(['email must be valid', 'password is required']),
			createHost(),
		);

		expect(response.status).toHaveBeenCalledWith(400);
		expect(response.json).toHaveBeenCalledWith({
			statusCode: 400,
			message: 'Validation failed',
			data: null,
			errors: ['email must be valid', 'password is required'],
			errorCode: 'VALIDATION_FAILED',
		});
	});

	it('does not expose unexpected internal error details', () => {
		filter.catch(
			new InternalServerErrorException('private implementation detail'),
			createHost(),
		);

		expect(response.status).toHaveBeenCalledWith(500);
		expect(response.json).toHaveBeenCalledWith({
			statusCode: 500,
			message: 'Internal server error',
			data: null,
			errors: null,
			errorCode: 'INTERNAL_SERVER_ERROR',
		});
	});

	it('preserves service-unavailable status with a safe stable error code', () => {
		filter.catch(
			new ServiceUnavailableException('private dependency detail'),
			createHost(),
		);

		expect(response.status).toHaveBeenCalledWith(503);
		expect(response.json).toHaveBeenCalledWith({
			statusCode: 503,
			message: 'Service unavailable',
			data: null,
			errors: null,
			errorCode: 'SERVICE_UNAVAILABLE',
		});
	});

	it('uses a catalog error code and allows a response-specific message override', () => {
		filter.catch(
			new ApiException('FLASH_CARD_ACCESS_DENIED', 'Custom access message'),
			createHost(),
		);

		expect(response.status).toHaveBeenCalledWith(403);
		expect(response.json).toHaveBeenCalledWith({
			statusCode: 403,
			message: 'Custom access message',
			data: null,
			errors: null,
			errorCode: 'FLASH_CARD_ACCESS_DENIED',
		});
	});
});
