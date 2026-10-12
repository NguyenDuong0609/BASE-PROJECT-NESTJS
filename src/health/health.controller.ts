import {
	Controller,
	Get,
	Optional,
	ServiceUnavailableException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { DataSource } from 'typeorm';
import { QueueService } from '@modules/queue/queue.service';
import { getErrorMessage } from '../shared/error-utils';
import { SkipThrottle } from '@nestjs/throttler';
import { createContextLogger } from '../configs/logger.config';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
@SkipThrottle()
export class HealthController {
	private readonly logger: PinoLogger;

	constructor(
		private readonly dataSource: DataSource,
		private readonly queueService: QueueService,
		@Optional() logger?: PinoLogger,
	) {
		this.logger = createContextLogger(HealthController.name, logger);
	}

	@Get()
	@ApiOperation({ summary: 'Liveness check' })
	liveness() {
		return { status: 'ok' };
	}

	@Get('live')
	@ApiOperation({ summary: 'Liveness check (alternative endpoint)' })
	live() {
		return this.liveness();
	}

	@Get('ready')
	@ApiOperation({
		summary: 'Readiness check - verifies database and Redis connectivity',
	})
	async readiness() {
		try {
			await Promise.all([
				this.dataSource.query('SELECT 1'),
				this.queueService.pingRedis(),
			]);
			return { status: 'ready' };
		} catch (error) {
			this.logger.warn(
				{ err: error, message: getErrorMessage(error) },
				'Readiness check failed',
			);
			throw new ServiceUnavailableException(
				'A required dependency is unavailable',
			);
		}
	}
}
