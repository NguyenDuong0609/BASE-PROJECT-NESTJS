import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { OAuthCookieStateStore } from '../utils/oauth-cookie-state.store';

interface GoogleProfile {
	googleId: string;
	email: string;
	emailVerified: boolean;
	firstName: string;
	lastName: string;
	avatar?: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
	constructor(
		private readonly configService: ConfigService,
		private readonly authService: AuthService,
	) {
		super({
			clientID: configService.get('google.clientId') || 'disabled',
			clientSecret: configService.get('google.clientSecret') || 'disabled',
			callbackURL:
				configService.get('google.callbackUrl') ||
				'http://localhost/auth/google/callback',
			scope: ['email', 'profile'],
			store: new OAuthCookieStateStore(
				configService.get<string>('app.environment') === 'production',
			),
		});
	}

	async validate(
		accessToken: string,
		refreshToken: string,
		profile: Profile,
		done: VerifyCallback,
	): Promise<any> {
		const { id, name, emails, photos } = profile;
		if (!emails?.[0]?.value || !emails[0].verified || !name) {
			return done(
				new UnauthorizedException('Google account must have a verified email'),
			);
		}

		const googleProfile: GoogleProfile = {
			googleId: id,
			email: emails[0].value,
			emailVerified: emails[0].verified,
			firstName: name.givenName || '',
			lastName: name.familyName || '',
			avatar: photos?.[0]?.value,
		};

		const user = await this.authService.validateGoogleUser(googleProfile);
		done(null, user);
	}
}
