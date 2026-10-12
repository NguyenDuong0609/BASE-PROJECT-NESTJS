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
			isArray(values) &&
			values.length === 1 &&
			typeof values[0] === 'string' &&
			values[0].includes(',')
		) {
			request.body[this.propertyName] = values[0]
				.split(',')
				.map((s) => s.trim());
		} else if (typeof values === 'string') {
			try {
				const parsed = JSON.parse(values);
				if (Array.isArray(parsed)) {
					request.body[this.propertyName] = parsed;
				} else {
					request.body[this.propertyName] = [values];
				}
			} catch {
				request.body[this.propertyName] = values.includes(',')
					? values.split(',').map((s) => s.trim())
					: [values];
			}
		}
		return next.handle();
	}
}
