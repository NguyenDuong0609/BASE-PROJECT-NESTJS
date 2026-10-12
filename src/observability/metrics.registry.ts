import { Injectable } from '@nestjs/common';

const LATENCY_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5];

interface HttpMetric {
	method: string;
	path: string;
	status: number;
	count: number;
	durationSeconds: number;
	bucketCounts: number[];
}

type CacheResult = 'hit' | 'miss' | 'bypass' | 'error';
type QueueState = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';

interface DbPoolMetrics {
	active: number;
	idle: number;
	total: number;
	waiting: number;
}

@Injectable()
export class MetricsRegistry {
	private readonly httpMetrics = new Map<string, HttpMetric>();
	private readonly cacheMetrics = new Map<string, number>();
	private readonly queueDepths = new Map<string, number>();
	private dbPoolMetrics: DbPoolMetrics = {
		active: 0,
		idle: 0,
		total: 0,
		waiting: 0,
	};

	recordHttpRequest(
		method: string,
		path: string,
		status: number,
		durationSeconds: number,
	): void {
		const key = JSON.stringify([method, path, status]);
		const metric = this.httpMetrics.get(key) ?? {
			method,
			path,
			status,
			count: 0,
			durationSeconds: 0,
			bucketCounts: LATENCY_BUCKETS.map(() => 0),
		};

		metric.count += 1;
		metric.durationSeconds += durationSeconds;
		LATENCY_BUCKETS.forEach((bucket, index) => {
			if (durationSeconds <= bucket) {
				metric.bucketCounts[index] += 1;
			}
		});
		this.httpMetrics.set(key, metric);
	}

	recordCacheOperation(namespace: string, result: CacheResult): void {
		const key = JSON.stringify([namespace, result]);
		this.cacheMetrics.set(key, (this.cacheMetrics.get(key) ?? 0) + 1);
	}

	setQueueDepth(queue: string, state: QueueState, count: number): void {
		const key = JSON.stringify([queue, state]);
		this.queueDepths.set(key, count);
	}

	setDbPoolMetrics(
		active: number,
		idle: number,
		total: number,
		waiting: number,
	): void {
		this.dbPoolMetrics = { active, idle, total, waiting };
	}

	renderPrometheus(): string {
		const lines = [
			'# HELP http_server_requests_total Total HTTP requests handled by this process.',
			'# TYPE http_server_requests_total counter',
		];
		for (const metric of this.httpMetrics.values()) {
			lines.push(
				`http_server_requests_total${this.labels(metric)} ${metric.count}`,
			);
		}

		lines.push(
			'# HELP http_server_request_duration_seconds HTTP request duration in seconds.',
			'# TYPE http_server_request_duration_seconds histogram',
		);
		for (const metric of this.httpMetrics.values()) {
			LATENCY_BUCKETS.forEach((bucket, index) => {
				lines.push(
					`http_server_request_duration_seconds_bucket${this.labels(metric, `le="${bucket}"`)} ${metric.bucketCounts[index]}`,
				);
			});
			lines.push(
				`http_server_request_duration_seconds_bucket${this.labels(metric, 'le="+Inf"')} ${metric.count}`,
				`http_server_request_duration_seconds_sum${this.labels(metric)} ${metric.durationSeconds}`,
				`http_server_request_duration_seconds_count${this.labels(metric)} ${metric.count}`,
			);
		}
		lines.push(
			'# HELP app_cache_operations_total Application cache lookups by namespace and result.',
			'# TYPE app_cache_operations_total counter',
		);
		for (const [key, count] of this.cacheMetrics) {
			const [namespace, result] = JSON.parse(key) as [string, CacheResult];
			lines.push(
				`app_cache_operations_total{namespace="${this.escapeLabel(namespace)}",result="${result}"} ${count}`,
			);
		}
		lines.push(
			'# HELP app_queue_jobs Queue job counts by queue and state.',
			'# TYPE app_queue_jobs gauge',
		);
		for (const [key, count] of this.queueDepths) {
			const [queue, state] = JSON.parse(key) as [string, QueueState];
			lines.push(
				`app_queue_jobs{queue="${this.escapeLabel(queue)}",state="${state}"} ${count}`,
			);
		}
		lines.push(
			'# HELP db_pool_active_connections Number of active database connections.',
			'# TYPE db_pool_active_connections gauge',
			`db_pool_active_connections ${this.dbPoolMetrics.active}`,
		);
		lines.push(
			'# HELP db_pool_idle_connections Number of idle database connections.',
			'# TYPE db_pool_idle_connections gauge',
			`db_pool_idle_connections ${this.dbPoolMetrics.idle}`,
		);
		lines.push(
			'# HELP db_pool_max_connections Maximum number of database connections.',
			'# TYPE db_pool_max_connections gauge',
			`db_pool_max_connections ${this.dbPoolMetrics.total}`,
		);
		lines.push(
			'# HELP db_pool_waiting_connections Number of clients waiting for a database connection.',
			'# TYPE db_pool_waiting_connections gauge',
			`db_pool_waiting_connections ${this.dbPoolMetrics.waiting}`,
		);
		return `${lines.join('\n')}\n`;
	}

	private labels(metric: HttpMetric, extra = ''): string {
		const values = [
			`method="${this.escapeLabel(metric.method)}"`,
			`path="${this.escapeLabel(metric.path)}"`,
			`status="${metric.status}"`,
		];
		if (extra) values.push(extra);
		return `{${values.join(',')}}`;
	}

	private escapeLabel(value: string): string {
		return value
			.replace(/\\/g, '\\\\')
			.replace(/\n/g, '\\n')
			.replace(/"/g, '\\"');
	}
}
