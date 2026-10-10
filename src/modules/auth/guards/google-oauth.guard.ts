import {
	ExecutionContext,
	Injectable,
	ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
	constructor(private readonly configService: ConfigService) {
		super();
	}

	canActivate(context: ExecutionContext) {
		if (!this.configService.get<boolean>('features.googleOAuth')) {
			throw new ServiceUnavailableException('Google OAuth is not enabled');
		}
		return super.canActivate(context);
	}
}
