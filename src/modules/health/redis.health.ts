import { Injectable } from '@nestjs/common';
import {
	HealthIndicatorResult,
	HealthIndicatorService,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator {
	private readonly redis: Redis;

	constructor(
		private readonly configService: ConfigService,
		private readonly healthIndicatorService: HealthIndicatorService,
	) {
		this.redis = new Redis({
			host: this.configService.get('redis.host'),
			port: this.configService.get('redis.port'),
			password: this.configService.get('redis.password') || undefined,
			db: this.configService.get('redis.db'),
			lazyConnect: true,
			maxRetriesPerRequest: 1,
			connectTimeout: 5000,
		});
	}

	async pingCheck(key: string): Promise<HealthIndicatorResult> {
		return await this.healthIndicatorService.check(key).attempt(async () => {
			try {
				await this.redis.connect();
				const result = await this.redis.ping();
				if (result !== 'PONG') {
					throw new Error('Redis ping failed');
				}
				return { message: 'Redis is healthy' };
			} finally {
				if (this.redis.status !== 'end') {
					this.redis.disconnect();
				}
			}
		});
	}
}
