import { HttpException } from '@nestjs/common';

export const API_ERROR_CATALOG = {
	FLASH_CARD_NOT_FOUND: {
		statusCode: 404,
		message: 'Flash card not found',
	},
	FLASH_CARD_ACCESS_DENIED: {
		statusCode: 403,
		message: 'You cannot access this flash card',
	},
	VALIDATION_FAILED: {
		statusCode: 400,
		message: 'Validation failed',
	},
	INTERNAL_SERVER_ERROR: {
		statusCode: 500,
		message: 'Internal server error',
	},
	BAD_REQUEST: {
		statusCode: 400,
		message: 'Bad request',
	},
	UNAUTHORIZED: {
		statusCode: 401,
		message: 'Unauthorized',
	},
	FORBIDDEN: {
		statusCode: 403,
		message: 'Forbidden',
	},
	NOT_FOUND: {
		statusCode: 404,
		message: 'Not found',
	},
	CONFLICT: {
		statusCode: 409,
		message: 'Conflict',
	},
	UNPROCESSABLE_ENTITY: {
		statusCode: 422,
		message: 'Unprocessable entity',
	},
	TOO_MANY_REQUESTS: {
		statusCode: 429,
		message: 'Too many requests',
	},
	SERVICE_UNAVAILABLE: {
		statusCode: 503,
		message: 'Service unavailable',
	},
} as const;

export type ApiErrorCode = keyof typeof API_ERROR_CATALOG;

export const API_ERROR_CODE_BY_STATUS: Readonly<Record<number, ApiErrorCode>> =
	{
		400: 'BAD_REQUEST',
		401: 'UNAUTHORIZED',
		403: 'FORBIDDEN',
		404: 'NOT_FOUND',
		409: 'CONFLICT',
		422: 'UNPROCESSABLE_ENTITY',
		429: 'TOO_MANY_REQUESTS',
		500: 'INTERNAL_SERVER_ERROR',
		503: 'SERVICE_UNAVAILABLE',
	};

export function isApiErrorCode(value: string): value is ApiErrorCode {
	return Object.prototype.hasOwnProperty.call(API_ERROR_CATALOG, value);
}

export class ApiException extends HttpException {
	constructor(errorCode: ApiErrorCode, message?: string) {
		const definition = API_ERROR_CATALOG[errorCode];
		super(
			{
				errorCode,
				message: message ?? definition.message,
			},
			definition.statusCode,
		);
	}
}
