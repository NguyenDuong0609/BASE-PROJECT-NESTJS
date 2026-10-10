import { CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of, throwError } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';
import { execution_context } from 'src/shared/test/mocks/execution-context.mock';

const return_data = { foo: 'bar' };
const reflector = {
	getAllAndOverride: jest.fn(),
} as unknown as Reflector;

describe('ResponseInterceptor', () => {
	let interceptor: ResponseInterceptor;
	let next: CallHandler;

	beforeEach(() => {
		jest.clearAllMocks();
		interceptor = new ResponseInterceptor(reflector);
		jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
		jest
			.spyOn(execution_context, 'switchToHttp')
			.mockReturnValue({ getResponse: () => ({ statusCode: 201 }) } as never);
		// create the mock CallHandler for the interceptor
		next = {
			handle: jest.fn(() => of(return_data)),
		} as CallHandler;
	});

	describe('intercept', () => {
		it('formats success data with the actual HTTP status', async () => {
			const expected_data = {
				statusCode: 201,
				message: 'Resource created successfully',
				data: return_data,
				errors: null,
				errorCode: null,
			};

			await expect(
				firstValueFrom(interceptor.intercept(execution_context, next)),
			).resolves.toEqual(expected_data);
		});

		it('does not wrap an already formatted result twice', async () => {
			const formatted = {
				statusCode: 200,
				message: 'Loaded',
				data: return_data,
				errors: null,
				errorCode: null,
			};
			next.handle = jest.fn(() => of(formatted));

			await expect(
				firstValueFrom(interceptor.intercept(execution_context, next)),
			).resolves.toBe(formatted);
		});

		it('uses the success message configured for the endpoint', async () => {
			jest
				.spyOn(reflector, 'getAllAndOverride')
				.mockReturnValue('FLASH_CARD_CREATED');

			await expect(
				firstValueFrom(interceptor.intercept(execution_context, next)),
			).resolves.toEqual({
				statusCode: 201,
				message: 'Flash card created successfully',
				data: return_data,
				errors: null,
				errorCode: null,
			});
		});

		it('leaves errors for the global exception filter', async () => {
			const error = new Error('Something went wrong');
			next.handle = jest.fn(() => throwError(() => error));
			await expect(
				firstValueFrom(interceptor.intercept(execution_context, next)),
			).rejects.toBe(error);
		});
	});
});
