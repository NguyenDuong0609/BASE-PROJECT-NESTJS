import {
	Body,
	Controller,
	Get,
	Param,
	ParseUUIDPipe,
	Put,
	Req,
	UseGuards,
} from '@nestjs/common';
import {
	ApiBearerAuth,
	ApiBody,
	ApiOperation,
	ApiParam,
	ApiTags,
} from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { JwtAccessTokenGuard } from '../auth/guards/jwt-access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { USER_ROLE } from '../user-roles/entities/user-role.entity';
import { PermissionsService } from './permissions.service';
import { ReplaceRolePermissionsDto } from './dto/replace-role-permissions.dto';
import { AuditLogService } from '../../observability/audit-log.service';
import { RequestWithUser } from '../../types/requests.type';

@Controller('permissions')
@ApiTags('permissions')
@ApiBearerAuth('token')
@UseGuards(JwtAccessTokenGuard, RolesGuard)
@Roles(USER_ROLE.ADMIN)
export class PermissionsController {
	constructor(
		private readonly permissions: PermissionsService,
		private readonly auditLog: AuditLogService,
		private readonly dataSource: DataSource,
	) {}

	@Get()
	@ApiOperation({ summary: 'List available permissions (Admin only)' })
	list() {
		return this.permissions.list();
	}

	@Get('roles')
	@ApiOperation({
		summary: 'List roles and their assigned permissions (Admin only)',
	})
	listRoles() {
		return this.permissions.listRoles();
	}

	@Put('roles/:roleId')
	@ApiOperation({
		summary: 'Replace all permissions assigned to a role (Admin only)',
	})
	@ApiParam({
		name: 'roleId',
		format: 'uuid',
		example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b',
	})
	@ApiBody({
		type: ReplaceRolePermissionsDto,
		examples: {
			flashCardReader: {
				summary: 'Grant basic flash-card access',
				value: { codes: ['flash-cards:read', 'flash-cards:create'] },
			},
		},
	})
	replaceRolePermissions(
		@Param('roleId', ParseUUIDPipe) roleId: string,
		@Body() body: ReplaceRolePermissionsDto,
		@Req() request: RequestWithUser,
	) {
		return this.dataSource.transaction(async (manager) => {
			const role = await this.permissions.replaceRolePermissions(
				roleId,
				body.codes,
				manager,
			);
			await this.auditLog.recordEvent(
				{
					eventType: 'security',
					action: 'ROLE_PERMISSIONS_REPLACED',
					actorUserId: request.user.id,
					resourceType: 'UserRole',
					resourceId: role.id,
					metadata: { permissionCount: body.codes.length },
				},
				manager,
			);
			return role;
		});
	}
}
