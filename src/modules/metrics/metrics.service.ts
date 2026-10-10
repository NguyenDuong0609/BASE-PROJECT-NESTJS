import { Injectable, OnModuleInit } from '@nestjs/common';
import {
	register,
	Counter,
	Histogram,
	Gauge,
	collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
	private readonly httpRequestsTotal: Counter;
	private readonly httpRequestDuration: Histogram;
	private readonly activeConnections: Gauge;

	constructor() {
		// Collect default metrics (CPU, memory, etc.)
		collectDefaultMetrics({ register });

		// Custom metrics
		this.httpRequestsTotal = new Counter({
			name: 'http_requests_total',
			help: 'Total number of HTTP requests',
			labelNames: ['method', 'route', 'status_code'],
			registers: [register],
		});

		this.httpRequestDuration = new Histogram({
			name: 'http_request_duration_seconds',
			help: 'Duration of HTTP requests in seconds',
			labelNames: ['method', 'route', 'status_code'],
			buckets: [0.1, 0.5, 1, 2, 5],
			registers: [register],
		});

		this.activeConnections = new Gauge({
			name: 'active_connections',
			help: 'Number of active connections',
			registers: [register],
		});
	}

	onModuleInit() {
		// Initialize metrics on startup
		this.activeConnections.set(0);
	}

	async getMetrics(): Promise<string> {
		return register.metrics();
	}

	recordRequest(
		method: string,
		route: string,
		statusCode: number,
		duration: number,
	) {
		this.httpRequestsTotal.inc({ method, route, status_code: statusCode });
		this.httpRequestDuration.observe(
			{ method, route, status_code: statusCode },
			duration,
		);
	}

	incrementActiveConnections() {
		this.activeConnections.inc();
	}

	decrementActiveConnections() {
		this.activeConnections.dec();
	}
}
