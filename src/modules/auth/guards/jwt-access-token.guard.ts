import {
	ExecutionContext,
	ForbiddenException,
	Injectable,
	Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from 'src/decorators/auth.decorator';
import { ConfigService } from '@nestjs/config';
import { extractCookieToken } from '../utils/cookie-token.extractor';

@Injectable()
export class JwtAccessTokenGuard extends AuthGuard('jwt') {
	constructor(
		private reflector: Reflector,
		@Optional() private readonly configService?: ConfigService,
	) {
		super();
	}
	canActivate(
		context: ExecutionContext,
	): boolean | Promise<boolean> | Observable<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (isPublic) {
			return true;
		}
		const request = context.switchToHttp().getRequest();
		if (
			!['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
			extractCookieToken(request, 'access_token')
		) {
			const origin = request.headers.origin;
			const allowedOrigins =
				this.configService?.get<string[]>('cors.origins', []) || [];
			const frontendUrl = this.configService?.get<string>('frontend.url');
			if (
				!origin ||
				![
					...allowedOrigins,
					...(frontendUrl ? [new URL(frontendUrl).origin] : []),
				].includes(origin)
			) {
				throw new ForbiddenException(
					'Origin is not allowed for cookie authentication',
				);
			}
		}
		return super.canActivate(context);
	}
}
