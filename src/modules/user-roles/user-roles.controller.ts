import {
	Controller,
	Get,
	Post,
	Body,
	Patch,
	Param,
	Delete,
	UseInterceptors,
	ClassSerializerInterceptor,
	ParseUUIDPipe,
	UseGuards,
	Req,
} from '@nestjs/common';
import { UserRolesService } from './user-roles.service';
import { CreateUserRoleDto } from './dto/create-user-role.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { ApiBearerAuth, ApiParam, ApiTags, ApiBody, ApiConflictResponse } from '@nestjs/swagger';
import { JwtAccessTokenGuard } from '@modules/auth/guards/jwt-access-token.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { USER_ROLE } from './entities/user-role.entity';
import { ApiSuccessMessage } from 'src/decorators/api-success-message.decorator';
import { RequestWithUser } from 'src/types/requests.type';
import { AuditLogService } from '../../observability/audit-log.service';
import { DataSource } from 'typeorm';

@Controller('user-roles')
@ApiTags('user-roles')
@ApiBearerAuth('token')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAccessTokenGuard, RolesGuard)
@Roles(USER_ROLE.ADMIN)
export class UserRolesController {
	constructor(
		private readonly userRolesService: UserRolesService,
		private readonly auditLog: AuditLogService,
		private readonly dataSource: DataSource,
	) {}

	@Post()
	@ApiSuccessMessage('ROLE_CREATED')
	@ApiConflictResponse({ description: 'Role already exists' })
	@ApiBody({
		type: CreateUserRoleDto,
		examples: {
			role_1: {
				value: {
					name: USER_ROLE.TEAM_LEADER,
					description: 'Team leader role with project management permissions',
				} as CreateUserRoleDto,
			},
			role_2: {
				value: {
					name: USER_ROLE.USER,
					description: 'Standard user role with default access rights',
				} as CreateUserRoleDto,
			},
		},
	})
	async create(
		@Body() createUserRoleDto: CreateUserRoleDto,
		@Req() request: RequestWithUser,
	) {
		return this.dataSource.transaction(async (manager) => {
			const role = await this.userRolesService.createInTransaction(
				createUserRoleDto,
				manager,
			);
			await this.auditLog.recordEvent(
				{
					eventType: 'security',
					action: 'ROLE_CREATED',
					actorUserId: request.user.id,
					resourceType: 'UserRole',
					resourceId: role.id,
				},
				manager,
			);
			return role;
		});
	}

	@Get()
	findAll() {
		return this.userRolesService.findAll();
	}

	@Get(':id')
	@ApiParam({
		name: 'id',
		example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b',
		description: 'User Role UUID',
	})
	findOne(@Param('id', ParseUUIDPipe) id: string) {
		return this.userRolesService.findOne(id);
	}

	@Patch(':id')
	@ApiSuccessMessage('ROLE_UPDATED')
	@ApiParam({
		name: 'id',
		example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b',
		description: 'User Role UUID',
	})
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateUserRoleDto: UpdateUserRoleDto,
		@Req() request: RequestWithUser,
	) {
		return this.dataSource.transaction(async (manager) => {
			const role = await this.userRolesService.updateInTransaction(
				id,
				updateUserRoleDto,
				manager,
			);
			await this.auditLog.recordEvent(
				{
					eventType: 'security',
					action: 'ROLE_UPDATED',
					actorUserId: request.user.id,
					resourceType: 'UserRole',
					resourceId: id,
					metadata: { changedFields: Object.keys(updateUserRoleDto).length },
				},
				manager,
			);
			return role;
		});
	}

	@Delete(':id')
	@ApiSuccessMessage('ROLE_DELETED')
	@ApiParam({
		name: 'id',
		example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b',
		description: 'User Role UUID',
	})
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() request: RequestWithUser,
	) {
		await this.dataSource.transaction(async (manager) => {
			await this.userRolesService.removeInTransaction(id, manager);
			await this.auditLog.recordEvent(
				{
					eventType: 'security',
					action: 'ROLE_DELETED',
					actorUserId: request.user.id,
					resourceType: 'UserRole',
					resourceId: id,
				},
				manager,
			);
		});
	}
}
