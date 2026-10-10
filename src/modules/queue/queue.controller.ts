import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
	ApiBearerAuth,
	ApiTags,
	ApiOperation,
	ApiParam,
} from '@nestjs/swagger';
import { QueueService } from './queue.service';
import { JwtAccessTokenGuard } from '@modules/auth/guards/jwt-access-token.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { USER_ROLE } from '@modules/user-roles/entities/user-role.entity';

@ApiTags('Queue Monitoring')
@Controller('queues')
@ApiBearerAuth('token')
@UseGuards(JwtAccessTokenGuard, RolesGuard)
@Roles(USER_ROLE.ADMIN)
export class QueueController {
	constructor(private readonly queueService: QueueService) {}

	@Get(':name/status')
	@ApiOperation({ summary: 'Get queue status and metrics' })
	@ApiParam({
		name: 'name',
		enum: ['email-queue', 'image-queue', 'notification-queue'],
	})
	async getQueueStatus(@Param('name') name: string) {
		return this.queueService.getQueueStats(name);
	}

	@Get(':name/jobs/:jobId')
	@ApiOperation({ summary: 'Get job status by ID' })
	@ApiParam({
		name: 'name',
		enum: ['email-queue', 'image-queue', 'notification-queue'],
	})
	@ApiParam({ name: 'jobId', description: 'Job ID', example: '1' })
	async getJobStatus(
		@Param('name') name: string,
		@Param('jobId') jobId: string,
	) {
		return this.queueService.getJobStatus(name, jobId);
	}
}
