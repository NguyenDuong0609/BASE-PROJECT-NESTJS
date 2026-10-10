import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
} from '@nestjs/common';
import { isArray } from 'class-validator';
import { Request } from 'express';
import { Observable } from 'rxjs';

@Injectable()
export class SwaggerArrayConversion implements NestInterceptor {
	constructor(private readonly propertyName: string) {}
	intercept(
		context: ExecutionContext,
		next: CallHandler<any>,
	): Observable<any> | Promise<Observable<any>> {
		const request: Request = context.switchToHttp().getRequest();
		const referer = request.headers.referer || '';
		const values = request.body?.[this.propertyName];
		if (
			referer.includes('/api-docs') &&
			isArray(values) &&
			values.length === 1 &&
			typeof values[0] === 'string'
		) {
			request.body[this.propertyName] = values[0].split(',');
		}
		return next.handle();
	}
}
