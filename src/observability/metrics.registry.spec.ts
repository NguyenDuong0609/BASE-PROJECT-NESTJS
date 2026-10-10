import { MetricsRegistry } from './metrics.registry';

describe('MetricsRegistry', () => {
	it('renders escaped, bounded-label Prometheus HTTP counters and histograms', () => {
		const registry = new MetricsRegistry();
		registry.recordHttpRequest('GET', '/users/:id', 200, 0.02);
		registry.recordHttpRequest('GET', '/users/:id', 200, 0.5);
		registry.recordHttpRequest('GET', '/quoted"route', 500, 8);

		const output = registry.renderPrometheus();

		expect(output).toContain(
			'http_server_requests_total{method="GET",path="/users/:id",status="200"} 2',
		);
		expect(output).toContain(
			'http_server_request_duration_seconds_bucket{method="GET",path="/users/:id",status="200",le="0.025"} 1',
		);
		expect(output).toContain(
			'http_server_request_duration_seconds_bucket{method="GET",path="/users/:id",status="200",le="+Inf"} 2',
		);
		expect(output).toContain('path="/quoted\\"route"');
	});

	it('renders cache operation counters by namespace and result', () => {
		const registry = new MetricsRegistry();
		registry.recordCacheOperation('flash-cards', 'hit');
		registry.recordCacheOperation('flash-cards', 'miss');
		registry.recordCacheOperation('flash-cards', 'miss');

		expect(registry.renderPrometheus()).toContain(
			'app_cache_operations_total{namespace="flash-cards",result="miss"} 2',
		);
	});

	it('renders bounded queue depth gauges', () => {
		const registry = new MetricsRegistry();
		registry.setQueueDepth('email', 'waiting', 4);

		expect(registry.renderPrometheus()).toContain(
			'app_queue_jobs{queue="email",state="waiting"} 4',
		);
	});
});
