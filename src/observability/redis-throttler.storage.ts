import {
	Injectable,
	Optional,
	OnApplicationShutdown,
	ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerOptionsFactory, ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';
import { PinoLogger } from 'nestjs-pino';
import { createContextLogger } from '../configs/logger.config';

const REDIS_INCREMENT_SCRIPT = `
local blockedTtl = redis.call('pttl', KEYS[2])
if blockedTtl > 0 then
  local remainingTtl = redis.call('pttl', KEYS[1])
  return {tonumber(ARGV[2]) + 1, math.max(remainingTtl, 0), 1, blockedTtl}
end
local totalHits = redis.call('incr', KEYS[1])
local remainingTtl = redis.call('pttl', KEYS[1])
if totalHits == 1 or remainingTtl < 0 then
  redis.call('pexpire', KEYS[1], ARGV[1])
  remainingTtl = tonumber(ARGV[1])
end
if totalHits > tonumber(ARGV[2]) then
  redis.call('set', KEYS[2], '1', 'PX', ARGV[3])
  return {totalHits, remainingTtl, 1, tonumber(ARGV[3])}
end
return {totalHits, remainingTtl, 0, 0}
`;

@Injectable()
export class RedisThrottlerStorage
	implements ThrottlerStorage, OnApplicationShutdown
{
	private readonly logger: PinoLogger;
	private readonly redis: Redis;
	private connectionPromise?: Promise<void>;
	private warnedUnavailable = false;

	constructor(config: ConfigService, @Optional() logger?: PinoLogger) {
		this.logger = createContextLogger(RedisThrottlerStorage.name, logger);
		this.redis = new Redis({
			host: config.get<string>('redis.host'),
			port: config.get<number>('redis.port'),
			password: config.get<string>('redis.password'),
			db: config.get<number>('redis.db'),
			lazyConnect: true,
			enableOfflineQueue: false,
			maxRetriesPerRequest: 1,
			connectTimeout: 2_000,
			commandTimeout: 2_000,
		});
		this.redis.on('error', (error: Error) => {
			if (this.warnedUnavailable) return;
			this.warnedUnavailable = true;
			this.logger.error({ err: error }, 'Redis rate-limit storage error');
		});
		this.redis.on('ready', () => {
			this.warnedUnavailable = false;
		});
	}

	async increment(
		key: string,
		ttl: number,
		limit: number,
		blockDuration: number,
		throttlerName: string,
	): Promise<{
		totalHits: number;
		timeToExpire: number;
		isBlocked: boolean;
		timeToBlockExpire: number;
	}> {
		try {
			await this.ensureConnected();
			const redisKey = `app-throttler:v1:${encodeURIComponent(throttlerName)}:${encodeURIComponent(key)}`;
			const blockKey = `${redisKey}:blocked`;
			const result = (await this.redis.eval(
				REDIS_INCREMENT_SCRIPT,
				2,
				redisKey,
				blockKey,
				Math.max(1, ttl),
				Math.max(0, limit),
				Math.max(1, blockDuration),
			)) as [number, number, number, number];

			return {
				totalHits: Number(result[0]),
				timeToExpire: Math.max(0, Number(result[1])),
				isBlocked: Number(result[2]) === 1,
				timeToBlockExpire: Math.max(0, Number(result[3])),
			};
		} catch (error) {
			throw new ServiceUnavailableException(
				'Rate-limit storage is unavailable',
				{ cause: error },
			);
		}
	}

	async onApplicationShutdown(): Promise<void> {
		this.redis.disconnect();
	}

	private async ensureConnected(): Promise<void> {
		if (this.redis.status === 'ready') return;
		if (this.connectionPromise) return this.connectionPromise;
		if (this.redis.status !== 'wait') {
			throw new Error(`Redis is not ready (status: ${this.redis.status})`);
		}

		const connecting = this.redis.connect().then(() => undefined);
		this.connectionPromise = connecting;
		try {
			await connecting;
		} finally {
			if (this.connectionPromise === connecting) {
				this.connectionPromise = undefined;
			}
		}
	}
}

@Injectable()
export class RedisThrottlerOptionsFactory
	implements ThrottlerOptionsFactory, OnApplicationShutdown
{
	private storage?: RedisThrottlerStorage;

	constructor(private readonly config: ConfigService) {}

	createThrottlerOptions() {
		this.storage = new RedisThrottlerStorage(this.config);
		return {
			throttlers: [{ ttl: 60_000, limit: 120 }],
			storage: this.storage,
		};
	}

	async onApplicationShutdown(): Promise<void> {
		await this.storage?.onApplicationShutdown();
	}
}
