import {
	ExecutionContext,
	ForbiddenException,
	Injectable,
	Optional,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { extractCookieToken } from '../utils/cookie-token.extractor';

@Injectable()
export class JwtRefreshTokenGuard extends AuthGuard('refresh_token') {
	constructor(@Optional() private readonly configService?: ConfigService) {
		super();
	}

	canActivate(context: ExecutionContext) {
		const request = context.switchToHttp().getRequest();
		if (
			!['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
			extractCookieToken(request, 'refresh_token')
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
