import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { MetricsService } from './metrics.service';

@ApiTags('Observability')
@SkipThrottle()
@Controller('metrics')
export class MetricsController {
	constructor(private readonly metricsService: MetricsService) {}

	@Get()
	@Header('Content-Type', 'text/plain')
	@ApiOperation({ summary: 'Prometheus metrics endpoint' })
	async getMetrics(): Promise<string> {
		return this.metricsService.getMetrics();
	}
}
