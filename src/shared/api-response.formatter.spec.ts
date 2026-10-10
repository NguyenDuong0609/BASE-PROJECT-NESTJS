import { ApiResponseFormatter } from './api-response.formatter';

describe('ApiResponseFormatter', () => {
	it('formats successful responses and accepts a custom message/status', () => {
		expect(
			ApiResponseFormatter.success({ id: 'resource-id' }, 'Created', 201),
		).toEqual({
			statusCode: 201,
			message: 'Created',
			data: { id: 'resource-id' },
			errors: null,
			errorCode: null,
		});
	});

	it('formats failures with an optional validation error list', () => {
		expect(
			ApiResponseFormatter.failure(
				422,
				'Validation failed',
				['email must be valid'],
				'VALIDATION_FAILED',
			),
		).toEqual({
			statusCode: 422,
			message: 'Validation failed',
			data: null,
			errors: ['email must be valid'],
			errorCode: 'VALIDATION_FAILED',
		});
	});
});
