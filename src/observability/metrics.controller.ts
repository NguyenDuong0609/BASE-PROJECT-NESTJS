import { Controller, Get, Header, Res } from '@nestjs/common';
import { Response } from 'express';
import { FeatureFlag } from '../decorators/feature-flag.decorator';
import { Public } from '../decorators/auth.decorator';
import { MetricsRegistry } from './metrics.registry';
import { QueueService } from '@modules/queue/queue.service';

const QUEUE_STATES = [
	'waiting',
	'active',
	'completed',
	'failed',
	'delayed',
] as const;

@Controller('metrics')
@FeatureFlag('metrics')
@Public()
export class MetricsController {
	constructor(
		private readonly metrics: MetricsRegistry,
		private readonly queueService: QueueService,
	) {}

	@Get()
	@Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
	async render(@Res() response: Response): Promise<void> {
		const queues = await this.queueService.getMetricsSnapshot();
		for (const [queue, states] of Object.entries(queues)) {
			for (const state of QUEUE_STATES) {
				const count = states[state];
				if (typeof count === 'number') {
					this.metrics.setQueueDepth(queue, state, count);
				}
			}
		}
		response.send(this.metrics.renderPrometheus());
	}
}
