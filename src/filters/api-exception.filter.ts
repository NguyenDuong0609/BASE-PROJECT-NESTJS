import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	Optional,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Request, Response } from 'express';
import {
	API_ERROR_CODE_BY_STATUS,
	ApiErrorCode,
	isApiErrorCode,
} from '../shared/api-errors';
import { ApiResponseFormatter } from '../shared/api-response.formatter';
import { createContextLogger } from '../configs/logger.config';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
	private readonly logger: PinoLogger;

	constructor(@Optional() logger?: PinoLogger) {
		this.logger = createContextLogger(ApiExceptionFilter.name, logger);
	}

	catch(exception: unknown, host: ArgumentsHost): void {
		const context = host.switchToHttp();
		const request = context.getRequest<
			Request & { id?: string; requestId?: string }
		>();
		const response = context.getResponse<Response>();
		const statusCode =
			exception instanceof HttpException ? exception.getStatus() : 500;
		const { message, errors, errorCode } = this.getErrorDetails(exception);

		if (statusCode >= 500) {
			this.logger.error(
				{
					err: exception,
					method: request.method,
					url: request.url?.split('?', 1)[0],
					statusCode,
					requestId: request.headers?.['x-request-id'],
					userId: (request as Request & { user?: { id?: string } }).user?.id,
				},
				'HTTP request failed',
			);
		}

		response
			.status(statusCode)
			.json(
				ApiResponseFormatter.failure(statusCode, message, errors, errorCode),
			);
	}

	private getErrorDetails(exception: unknown): {
		message: string;
		errors: string[] | null;
		errorCode: ApiErrorCode | null;
	} {
		if (!(exception instanceof HttpException)) {
			return {
				message: 'Internal server error',
				errors: null,
				errorCode: 'INTERNAL_SERVER_ERROR',
			};
		}
		if (exception.getStatus() === 503) {
			return {
				message: 'Service unavailable',
				errors: null,
				errorCode: 'SERVICE_UNAVAILABLE',
			};
		}
		if (exception.getStatus() >= 500) {
			return {
				message: 'Internal server error',
				errors: null,
				errorCode: 'INTERNAL_SERVER_ERROR',
			};
		}

		const exceptionResponse = exception.getResponse();
		if (typeof exceptionResponse === 'string') {
			return {
				message: exceptionResponse,
				errors: null,
				errorCode: API_ERROR_CODE_BY_STATUS[exception.getStatus()] ?? null,
			};
		}

		if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
			const responseBody = exceptionResponse as {
				message?: unknown;
				errorCode?: unknown;
			};
			const errorCode =
				typeof responseBody.errorCode === 'string' &&
				isApiErrorCode(responseBody.errorCode)
					? responseBody.errorCode
					: null;
			const responseMessage = responseBody.message;
			if (Array.isArray(responseMessage)) {
				const errors = responseMessage.filter(
					(value): value is string => typeof value === 'string',
				);
				return {
					message: 'Validation failed',
					errors,
					errorCode: 'VALIDATION_FAILED',
				};
			}

			if (typeof responseMessage === 'string') {
				return {
					message: responseMessage,
					errors: null,
					errorCode:
						errorCode ??
						API_ERROR_CODE_BY_STATUS[exception.getStatus()] ??
						null,
				};
			}
		}

		return {
			message: exception.message,
			errors: null,
			errorCode: API_ERROR_CODE_BY_STATUS[exception.getStatus()] ?? null,
		};
	}
}
