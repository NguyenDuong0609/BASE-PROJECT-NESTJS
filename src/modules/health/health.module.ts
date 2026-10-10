import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis.health';
import { MigrationHealthIndicator } from './migration.health';

@Module({
	imports: [TerminusModule],
	controllers: [HealthController],
	providers: [RedisHealthIndicator, MigrationHealthIndicator],
})
export class HealthModule {}
