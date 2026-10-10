import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { performance } from 'node:perf_hooks';
import { Observable, tap } from 'rxjs';
import { HttpException } from '@nestjs/common';
import { MetricsRegistry } from './metrics.registry';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
	constructor(private readonly metrics: MetricsRegistry) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		if (context.getType() !== 'http') return next.handle();

		const http = context.switchToHttp();
		const request = http.getRequest<Request>();
		const response = http.getResponse<{ statusCode: number }>();
		const path = request.route?.path
			? `${request.baseUrl}${request.route.path}`
			: 'unmatched';

		if (request.path === '/metrics') return next.handle();

		const startedAt = performance.now();
		const record = (status: number) => {
			this.metrics.recordHttpRequest(
				request.method,
				path,
				status,
				(performance.now() - startedAt) / 1000,
			);
		};

		return next.handle().pipe(
			tap({
				next: () => record(response.statusCode),
				error: (error: unknown) =>
					record(error instanceof HttpException ? error.getStatus() : 500),
			}),
		);
	}
}
