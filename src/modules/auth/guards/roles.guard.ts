import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { ROLES } from 'src/decorators/roles.decorator';
import { RequestWithUser } from 'src/types/requests.type';

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(private readonly refector: Reflector) {}

	canActivate(
		context: ExecutionContext,
	): boolean | Promise<boolean> | Observable<boolean> {
		const roles: string[] = this.refector.getAllAndOverride(ROLES, [
			context.getHandler(),
			context.getClass(),
		]);
		const request: RequestWithUser = context.switchToHttp().getRequest();
		if (!roles?.length) {
			return true;
		}
		const userRole =
			typeof request.user?.role === 'object'
				? request.user.role?.name
				: request.user?.role;
		return roles.includes(userRole);
	}
}
