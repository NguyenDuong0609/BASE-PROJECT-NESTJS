import {
	ExceptionFilter,
	Catch,
	ArgumentsHost,
	HttpException,
	HttpStatus,
	Optional,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { createContextLogger } from '../configs/logger.config';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
	private readonly logger: PinoLogger;

	constructor(@Optional() logger?: PinoLogger) {
		this.logger = createContextLogger(AllExceptionsFilter.name, logger);
	}

	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const request = ctx.getRequest<Request>();

		const status =
			exception instanceof HttpException
				? exception.getStatus()
				: HttpStatus.INTERNAL_SERVER_ERROR;

		const exceptionResponse =
			exception instanceof HttpException
				? exception.getResponse()
				: { message: 'Internal server error' };

		const message =
			typeof exceptionResponse === 'string'
				? exceptionResponse
				: (exceptionResponse as Record<string, unknown>).message ||
					'Internal server error';

		// Log error with full context using Pino
		this.logger.error(
			{
				err: exception,
				statusCode: status,
				path: request.url?.split('?', 1)[0],
				method: request.method,
				requestId: request.headers?.['x-request-id'],
				userId: (request as Request & { user?: { id?: string } }).user?.id,
			},
			'Unhandled HTTP exception',
		);

		response.status(status).json({
			statusCode: status,
			timestamp: new Date().toISOString(),
			path: request.url,
			message,
		});
	}
}
