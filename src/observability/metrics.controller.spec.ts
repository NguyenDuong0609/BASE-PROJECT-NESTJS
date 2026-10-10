jest.mock('@modules/queue/queue.service', () => ({
	QueueService: class QueueService {},
}));

import { MetricsController } from './metrics.controller';
import { MetricsRegistry } from './metrics.registry';

describe('MetricsController', () => {
	it('includes current queue counts in the Prometheus response', async () => {
		const metrics = new MetricsRegistry();
		const queues = {
			getMetricsSnapshot: jest.fn().mockResolvedValue({
				email: {
					waiting: 2,
					active: 1,
					completed: 8,
					failed: 0,
					delayed: 0,
				},
			}),
		};
		const controller = new MetricsController(metrics, queues as never);
		const response = { send: jest.fn() };

		await controller.render(response as never);

		expect(response.send).toHaveBeenCalledWith(
			expect.stringContaining(
				'app_queue_jobs{queue="email",state="waiting"} 2',
			),
		);
	});
});
