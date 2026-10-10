import { Injectable, OnModuleDestroy, Optional } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { MetricsRegistry } from '../../../../observability/metrics.registry';
import { createContextLogger } from '../../../../configs/logger.config';

const CACHE_NAMESPACE_PREFIX = 'app-cache:v1';
const LOCK_TTL_MS = 5_000;
const LOCK_WAIT_ATTEMPTS = 20;
const LOCK_WAIT_INTERVAL_MS = 50;
const WARNING_INTERVAL_MS = 30_000;

const RELEASE_LOCK_SCRIPT =
	"if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

@Injectable()
export class AppCacheService implements OnModuleDestroy {
	private readonly logger: PinoLogger;
	private readonly redis: Redis;
	private readonly cachePrefix: string;
	private readonly inFlight = new Map<string, Promise<unknown>>();
	private connectionPromise?: Promise<void>;
	private lastWarningAt = 0;

	constructor(
		private readonly configService: ConfigService,
		private readonly metrics: MetricsRegistry,
		@Optional() logger?: PinoLogger,
	) {
		this.logger = createContextLogger(AppCacheService.name, logger);
		this.cachePrefix = `${this.configService.get<string>('cache.prefix') || 'nestjs-base'}:${CACHE_NAMESPACE_PREFIX}`;
		this.redis = new Redis({
			host: this.configService.get<string>('redis.host'),
			port: this.configService.get<number>('redis.port'),
			password: this.configService.get<string>('redis.password'),
			db: this.configService.get<number>('redis.db'),
			lazyConnect: true,
			enableOfflineQueue: false,
			maxRetriesPerRequest: 1,
			retryStrategy: (attempt) => Math.min(attempt * 100, 2_000),
		});
		this.redis.on('error', (error: Error) => this.warnCacheFailure(error));
	}

	async getOrSet<T>(
		namespace: string,
		key: string,
		ttlMs: number,
		loader: () => Promise<T>,
		serialize: (value: T) => unknown = (value) => value,
	): Promise<T> {
		if (!this.isValidNamespace(namespace)) {
			throw new Error(`Invalid cache namespace: ${namespace}`);
		}
		if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0) {
			throw new Error('Cache TTL must be a positive integer in milliseconds');
		}

		const versionKey = `${this.cachePrefix}:${namespace}:version`;
		let version: string;
		try {
			await this.ensureConnected();
			version = (await this.redis.get(versionKey)) ?? '0';
		} catch (error) {
			this.warnCacheFailure(error);
			this.metrics.recordCacheOperation(namespace, 'bypass');
			return this.runSingleFlight(
				`bypass:${this.cachePrefix}:${namespace}:${encodeURIComponent(key)}`,
				loader,
			);
		}

		const cacheKey = `${this.cachePrefix}:${namespace}:${version}:${encodeURIComponent(key)}`;
		return this.runSingleFlight(cacheKey, () =>
			this.loadAndCache(namespace, cacheKey, ttlMs, loader, serialize),
		);
	}

	async invalidate(namespace: string): Promise<void> {
		if (!this.isValidNamespace(namespace)) {
			throw new Error(`Invalid cache namespace: ${namespace}`);
		}

		try {
			await this.ensureConnected();
			await this.redis.incr(`${this.cachePrefix}:${namespace}:version`);
		} catch (error) {
			this.warnCacheFailure(error);
		}
	}

	onModuleDestroy(): void {
		this.redis.disconnect();
	}

	private async runSingleFlight<T>(
		key: string,
		task: () => Promise<T>,
	): Promise<T> {
		const existing = this.inFlight.get(key);
		if (existing) {
			return existing as Promise<T>;
		}

		const pending = Promise.resolve().then(task);
		this.inFlight.set(key, pending);
		try {
			return await pending;
		} finally {
			if (this.inFlight.get(key) === pending) {
				this.inFlight.delete(key);
			}
		}
	}

	private async loadAndCache<T>(
		namespace: string,
		cacheKey: string,
		ttlMs: number,
		loader: () => Promise<T>,
		serialize: (value: T) => unknown,
	): Promise<T> {
		let lockToken: string | undefined;
		const lockKey = `${cacheKey}:lock`;

		try {
			const cached = await this.redis.get(cacheKey);
			if (cached !== null) {
				try {
					this.metrics.recordCacheOperation(namespace, 'hit');
					return JSON.parse(cached) as T;
				} catch (error) {
					this.warnCacheFailure(error);
					await this.redis.del(cacheKey);
				}
			}
			this.metrics.recordCacheOperation(namespace, 'miss');

			lockToken = randomUUID();
			const acquired = await this.redis.set(
				lockKey,
				lockToken,
				'PX',
				LOCK_TTL_MS,
				'NX',
			);
			if (acquired !== 'OK') {
				return this.waitForCachedValue(namespace, cacheKey, loader);
			}
		} catch (error) {
			this.warnCacheFailure(error);
			this.metrics.recordCacheOperation(namespace, 'bypass');
			return loader();
		}

		try {
			const value = await loader();
			if (value !== null && value !== undefined) {
				try {
					const serialized = JSON.stringify(serialize(value));
					if (serialized !== undefined) {
						const jitteredTtl = Math.round(ttlMs * (1 + Math.random() * 0.1));
						await this.redis.set(cacheKey, serialized, 'PX', jitteredTtl);
					}
				} catch (error) {
					this.warnCacheFailure(error);
					this.metrics.recordCacheOperation(namespace, 'error');
				}
			}
			return value;
		} finally {
			if (lockToken) {
				try {
					await this.redis.eval(RELEASE_LOCK_SCRIPT, 1, lockKey, lockToken);
				} catch (error) {
					this.warnCacheFailure(error);
				}
			}
		}
	}

	private async waitForCachedValue<T>(
		namespace: string,
		cacheKey: string,
		loader: () => Promise<T>,
	): Promise<T> {
		for (let attempt = 0; attempt < LOCK_WAIT_ATTEMPTS; attempt += 1) {
			await new Promise((resolve) =>
				setTimeout(resolve, LOCK_WAIT_INTERVAL_MS),
			);
			try {
				const cached = await this.redis.get(cacheKey);
				if (cached !== null) {
					try {
						this.metrics.recordCacheOperation(namespace, 'hit');
						return JSON.parse(cached) as T;
					} catch (error) {
						this.warnCacheFailure(error);
						this.metrics.recordCacheOperation(namespace, 'bypass');
						await this.redis.del(cacheKey);
						break;
					}
				}
			} catch (error) {
				this.warnCacheFailure(error);
				break;
			}
		}

		return loader();
	}

	private isValidNamespace(namespace: string): boolean {
		return namespace.length <= 64 && /^[a-z0-9:_-]+$/i.test(namespace);
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

	private warnCacheFailure(error: unknown): void {
		const now = Date.now();
		if (now - this.lastWarningAt < WARNING_INTERVAL_MS) return;

		this.lastWarningAt = now;
		this.logger.warn(
			{ err: error },
			'Application cache unavailable; bypassing Redis',
		);
	}
}
