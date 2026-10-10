import {
	CanActivate,
	ExecutionContext,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import {
	FeatureFlagName,
	FEATURE_FLAG_METADATA,
} from '../decorators/feature-flag.decorator';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly configService: ConfigService,
	) {}

	canActivate(context: ExecutionContext): boolean {
		const feature = this.reflector.getAllAndOverride<FeatureFlagName>(
			FEATURE_FLAG_METADATA,
			[context.getHandler(), context.getClass()],
		);

		if (
			feature &&
			!this.configService.get<boolean>(`features.${feature}`, true)
		) {
			throw new NotFoundException('This feature is not enabled');
		}
		return true;
	}
}
