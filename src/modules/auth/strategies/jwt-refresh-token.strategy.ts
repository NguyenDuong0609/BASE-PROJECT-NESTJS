import { Request } from 'express';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AuthService } from '../auth.service';
import { TokenPayload } from '../interfaces/token.interface';
import { ConfigService } from '@nestjs/config';
import { extractCookieToken } from '../utils/cookie-token.extractor';

@Injectable()
export class JwtRefreshTokenStrategy extends PassportStrategy(
	Strategy,
	'refresh_token',
) {
	constructor(
		private readonly authService: AuthService,
		configService: ConfigService,
	) {
		super({
			jwtFromRequest: ExtractJwt.fromExtractors([
				(request) => extractCookieToken(request, 'refresh_token'),
				ExtractJwt.fromAuthHeaderAsBearerToken(),
			]),
			ignoreExpiration: false,
			secretOrKey: configService.getOrThrow<string>('jwt.refreshTokenSecret'),
			algorithms: ['HS256'],
			passReqToCallback: true,
		});
	}

	async validate(request: Request, payload: TokenPayload) {
		return await this.authService.getUserIfRefreshTokenMatched(
			payload.user_id,
			extractCookieToken(request, 'refresh_token') ||
				ExtractJwt.fromAuthHeaderAsBearerToken()(request),
		);
	}
}
