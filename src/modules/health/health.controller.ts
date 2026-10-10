import { Controller, Get } from '@nestjs/common';
import {
	HealthCheck,
	HealthCheckService,
	TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { RedisHealthIndicator } from './redis.health';
import { MigrationHealthIndicator } from './migration.health';

@ApiTags('Health')
@SkipThrottle()
@Controller('health')
export class HealthController {
	constructor(
		private readonly health: HealthCheckService,
		private readonly db: TypeOrmHealthIndicator,
		private readonly redis: RedisHealthIndicator,
		private readonly migration: MigrationHealthIndicator,
	) {}

	/**
	 * Full health check – checks all dependencies (DB, Redis, Migrations, etc.)
	 * Used by monitoring systems and load balancers
	 */
	@Get()
	@HealthCheck()
	@ApiOperation({ summary: 'Full health check (DB + Redis + Migrations)' })
	check() {
		return this.health.check([
			() => this.db.pingCheck('database'),
			() => this.redis.pingCheck('redis'),
			() => this.migration.check('migrations'),
		]);
	}

	/**
	 * Readiness probe – is the app ready to serve traffic?
	 * Used by Kubernetes readiness probe
	 */
	@Get('ready')
	@HealthCheck()
	@ApiOperation({ summary: 'Readiness probe (DB + Redis connectivity)' })
	readiness() {
		return this.health.check([
			() => this.db.pingCheck('database'),
			() => this.redis.pingCheck('redis'),
		]);
	}

	/**
	 * Liveness probe – is the app process alive?
	 * Used by Kubernetes liveness probe
	 */
	@Get('live')
	@ApiOperation({ summary: 'Liveness probe (process is running)' })
	live() {
		return { status: 'ok' };
	}
}
