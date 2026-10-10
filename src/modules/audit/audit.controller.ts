import {
	BadRequestException,
	Controller,
	Get,
	Query,
	UseGuards,
} from '@nestjs/common';
import {
	ApiTags,
	ApiBearerAuth,
	ApiOperation,
	ApiQuery,
} from '@nestjs/swagger';
import { AuditLogService } from '../../observability/audit-log.service';
import { JwtAccessTokenGuard } from '@modules/auth/guards/jwt-access-token.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { ParsePaginationPipe } from '@modules/shared/base/pipes/parse-pagination.pipe';

@ApiTags('Audit')
@Controller('audit')
@ApiBearerAuth('token')
@UseGuards(JwtAccessTokenGuard, RolesGuard)
@Roles('Admin')
export class AuditController {
	constructor(private readonly auditLog: AuditLogService) {}

	@Get('events')
	@ApiOperation({
		summary: 'Search security and business audit events (Admin only)',
	})
	@ApiQuery({
		name: 'eventType',
		required: false,
		enum: ['security', 'business'],
		example: 'security',
	})
	@ApiQuery({ name: 'action', required: false, example: 'USER_CREATED' })
	@ApiQuery({ name: 'userId', required: false, example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b' })
	@ApiQuery({ name: 'resourceType', required: false, example: 'User' })
	@ApiQuery({ name: 'resourceId', required: false, example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b' })
	@ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
	@ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
	findEvents(
		@Query('eventType') eventType?: 'security' | 'business',
		@Query('action') action?: string,
		@Query('userId') userId?: string,
		@Query('resourceType') resourceType?: string,
		@Query('resourceId') resourceId?: string,
		@Query(
			'limit',
			new ParsePaginationPipe({ defaultValue: 50, minimum: 1, maximum: 100 }),
		)
		limit = 50,
		@Query(
			'offset',
			new ParsePaginationPipe({
				defaultValue: 0,
				minimum: 0,
				maximum: 1_000_000,
			}),
		)
		offset = 0,
	) {
		if (eventType && !['security', 'business'].includes(eventType)) {
			throw new BadRequestException('Invalid audit event type');
		}
		return this.auditLog.findEvents({
			eventType,
			action,
			userId,
			resourceType,
			resourceId,
			limit,
			offset,
		});
	}

	@Get('user')
	@ApiOperation({ summary: 'Get audit logs by user ID (Admin only)' })
	@ApiQuery({ name: 'userId', required: true, example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b' })
	@ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
	@ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
	findByUser(
		@Query('userId') userId: string,
		@Query(
			'limit',
			new ParsePaginationPipe({ defaultValue: 50, minimum: 1, maximum: 100 }),
		)
		limit = 50,
		@Query(
			'offset',
			new ParsePaginationPipe({
				defaultValue: 0,
				minimum: 0,
				maximum: 1_000_000,
			}),
		)
		offset = 0,
	) {
		return this.auditLog.findEvents({ userId, limit, offset });
	}

	@Get('resource')
	@ApiOperation({ summary: 'Get audit logs by resource (Admin only)' })
	@ApiQuery({ name: 'resource', required: true, example: 'User' })
	@ApiQuery({ name: 'resourceId', required: true, example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b' })
	@ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
	@ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
	findByResource(
		@Query('resource') resource: string,
		@Query('resourceId') resourceId: string,
		@Query(
			'limit',
			new ParsePaginationPipe({ defaultValue: 50, minimum: 1, maximum: 100 }),
		)
		limit = 50,
		@Query(
			'offset',
			new ParsePaginationPipe({
				defaultValue: 0,
				minimum: 0,
				maximum: 1_000_000,
			}),
		)
		offset = 0,
	) {
		return this.auditLog.findEvents({
			resourceType: resource,
			resourceId,
			limit,
			offset,
		});
	}
}
