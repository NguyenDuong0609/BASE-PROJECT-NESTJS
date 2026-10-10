import { UsersService } from '@modules/users/users.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TokenPayload } from '../interfaces/token.interface';
import { extractCookieToken } from '../utils/cookie-token.extractor';

@Injectable()
export class JwtAccessTokenStrategy extends PassportStrategy(Strategy) {
	private readonly configService: ConfigService;

	constructor(
		private readonly usersService: UsersService,
		configService: ConfigService,
	) {
		super({
			jwtFromRequest: ExtractJwt.fromExtractors([
				ExtractJwt.fromAuthHeaderAsBearerToken(),
				(request) => extractCookieToken(request, 'access_token'),
			]),
			ignoreExpiration: false,
			secretOrKey: configService.getOrThrow<string>('jwt.accessTokenSecret'),
			algorithms: ['HS256'],
		});
		this.configService = configService;
	}

	async validate(payload: TokenPayload) {
		const user = await this.usersService.getUserWithRole(payload.user_id);
		if (
			this.configService.get<boolean>('auth.requireVerifiedEmail') &&
			!user.isEmailVerified
		) {
			throw new UnauthorizedException('Email verification is required');
		}
		return user;
	}
}
