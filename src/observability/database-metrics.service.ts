import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MetricsRegistry } from './metrics.registry';

@Injectable()
export class DatabaseMetricsService implements OnModuleDestroy {
	private readonly logger = new Logger(DatabaseMetricsService.name);
	private interval: NodeJS.Timeout;

	constructor(
		@InjectDataSource()
		private readonly dataSource: DataSource,
		private readonly metrics: MetricsRegistry,
	) {
		// Delay start to ensure database is connected
		setTimeout(() => this.startCollecting(), 5000);
	}

	private startCollecting(): void {
		// Collect metrics every 10 seconds
		this.interval = setInterval(() => {
			this.collectMetrics();
		}, 10000);
		this.logger.log('Database metrics collection started');
	}

	private collectMetrics(): void {
		try {
			// Try to get pool metrics from TypeORM
			// @ts-ignore - TypeORM internal property
			const driver = this.dataSource.driver;
			// @ts-ignore
			const pool = driver.master || driver.pool;

			if (pool) {
				// TypeORM pool structure varies by driver
				// For Postgres with pg package
				// @ts-ignore
				const totalCount = pool.totalCount || pool.size || 0;
				// @ts-ignore
				const idleCount = pool.idleCount || 0;
				// @ts-ignore
				const waitingCount = pool.waitingCount || 0;

				const activeCount = totalCount - idleCount;

				// Update custom metrics in registry
				this.metrics.setDbPoolMetrics(
					activeCount,
					idleCount,
					totalCount,
					waitingCount,
				);
				this.logger.debug(
					`DB Pool metrics: active=${activeCount}, idle=${idleCount}, total=${totalCount}, waiting=${waitingCount}`,
				);
			} else {
				this.logger.warn('Database pool not available');
			}
		} catch (error) {
			this.logger.error('Failed to collect database metrics:', error);
		}
	}

	onModuleDestroy(): void {
		if (this.interval) {
			clearInterval(this.interval);
			this.logger.log('Database metrics collection stopped');
		}
	}
}
