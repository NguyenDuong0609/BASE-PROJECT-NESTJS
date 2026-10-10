import {
	Injectable,
	NestInterceptor,
	ExecutionContext,
	CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
	ApiResponse,
	ApiResponseFormatter,
} from '../shared/api-response.formatter';
import {
	API_SUCCESS_CATALOG,
	API_SUCCESS_MESSAGE_METADATA,
	ApiSuccessCode,
} from '../shared/api-success';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
	constructor(private readonly reflector: Reflector) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const response = context.switchToHttp().getResponse<{
			statusCode: number;
		}>();
		const successCode = this.reflector.getAllAndOverride<ApiSuccessCode>(
			API_SUCCESS_MESSAGE_METADATA,
			[context.getHandler(), context.getClass()],
		);
		const message =
			(successCode && API_SUCCESS_CATALOG[successCode]) ??
			(response.statusCode === 201
				? API_SUCCESS_CATALOG.RESOURCE_CREATED
				: API_SUCCESS_CATALOG.SUCCESS);

		return next.handle().pipe(
			map((data) => {
				if (this.isApiResponse(data)) {
					return data;
				}
				return ApiResponseFormatter.success(data, message, response.statusCode);
			}),
		);
	}

	private isApiResponse(data: unknown): data is ApiResponse {
		return (
			typeof data === 'object' &&
			data !== null &&
			'statusCode' in data &&
			'message' in data &&
			'data' in data &&
			'errors' in data &&
			'errorCode' in data
		);
	}
}
