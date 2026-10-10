import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS } from '../../decorators/permissions.decorator';
import { RequestWithUser } from '../../types/requests.type';
import { PermissionsService } from './permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly permissions: PermissionsService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS, [
			context.getHandler(),
			context.getClass(),
		]);
		if (!required?.length) return true;

		const request = context.switchToHttp().getRequest<RequestWithUser>();
		const roleId =
			typeof request.user?.role === 'object'
				? request.user.role?.id
				: undefined;
		if (!roleId || !(await this.permissions.hasAll(roleId, required))) {
			throw new ForbiddenException('Missing required permission');
		}
		return true;
	}
}
