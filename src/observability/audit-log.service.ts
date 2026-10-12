import { Injectable, Optional as NestOptional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { EntityManager, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AuditEvent } from './audit-event.entity';
import { AppCacheService } from '@modules/shared/base/cache/app-cache.service';
import { AppCacheKeyBuilder } from '@modules/shared/base/cache/app-cache-key.builder';

export interface RecordAuditEvent {
	eventType?: 'security' | 'business';
	action: string;
	actorUserId?: string | null;
	subjectUserId?: string | null;
	resourceType?: string | null;
	resourceId?: string | null;
	metadata?: Record<string, string | number | boolean | null>;
}

export interface AuditEventQuery {
	eventType?: 'security' | 'business';
	action?: string;
	userId?: string;
	resourceType?: string;
	resourceId?: string;
	limit: number;
	offset: number;
}

const AUDIT_CACHE_NAMESPACE = 'audit-events';
const AUDIT_CACHE_TTL_MS = 30_000;

@Injectable()
export class AuditLogService implements OnModuleInit, OnModuleDestroy {
	private retentionTimer?: NodeJS.Timeout;
	private retentionRunInProgress = false;

	constructor(
		@InjectRepository(AuditEvent)
		private readonly repository: Repository<AuditEvent>,
		private readonly logger: PinoLogger,
		private readonly config: ConfigService,
		@NestOptional() private readonly cache?: AppCacheService,
	) {
		this.logger.setContext?.(AuditLogService.name);
	}

	onModuleInit(): void {
		const retentionDays = this.config.get<number>('audit.retentionDays', 0);
		if (!retentionDays || retentionDays < 1) return;

		this.retentionTimer = setInterval(
			() => void this.pruneExpiredEvents(retentionDays),
			24 * 60 * 60 * 1000,
		);
		this.retentionTimer.unref();
	}

	onModuleDestroy(): void {
		if (this.retentionTimer) clearInterval(this.retentionTimer);
	}

	async record(
		action: string,
		subjectUserId: string | null,
		actorUserId: string | null = null,
		metadata: Record<string, string | number | boolean | null> = {},
		manager?: EntityManager,
	): Promise<void> {
		await this.recordEvent(
			{
				eventType: /^(AUTH_|ACCOUNT_)/.test(action) ? 'security' : 'business',
				action,
				subjectUserId,
				actorUserId,
				metadata,
			},
			manager,
		);
	}

	async recordEvent(
		event: RecordAuditEvent,
		manager?: EntityManager,
	): Promise<void> {
		const metadata = event.metadata ?? {};
		if (Object.keys(metadata).length > 20) {
			throw new Error('Audit metadata may contain at most 20 fields');
		}
		const sensitiveKey = Object.keys(metadata).find((key) =>
			/(password|token|secret|authorization|cookie|credential|email|phone|address|body|old.?value|new.?value|query)/i.test(
				key,
			),
		);
		if (sensitiveKey) {
			throw new Error(
				`Sensitive audit metadata key is not allowed: ${sensitiveKey}`,
			);
		}
		for (const [key, value] of Object.entries(metadata)) {
			if (
				key.length > 64 ||
				(!['string', 'number', 'boolean'].includes(typeof value) &&
					value !== null) ||
				(typeof value === 'string' && value.length > 512)
			) {
				throw new Error(
					'Audit metadata contains an invalid or oversized value',
				);
			}
		}

		const eventRepository = manager
			? manager.getRepository(AuditEvent)
			: this.repository;
		const saved = await eventRepository.save(
			eventRepository.create({
				event_type: event.eventType ?? 'business',
				action: event.action,
				actor_user_id: event.actorUserId ?? null,
				subject_user_id: event.subjectUserId ?? null,
				resource_type: event.resourceType ?? null,
				resource_id: event.resourceId ?? null,
				metadata,
			}),
		);

		this.logger.info(
			{
				event: 'audit_event',
				auditEventId: saved.id,
				eventType: saved.event_type,
				action: saved.action,
				actorUserId: saved.actor_user_id,
				subjectUserId: saved.subject_user_id,
				resourceType: saved.resource_type,
				resourceId: saved.resource_id,
			},
			'Audit event recorded',
		);
		await this.cache?.invalidate(AUDIT_CACHE_NAMESPACE);
	}

	async findEvents(query: AuditEventQuery) {
		if (!this.cache) {
			return this._findEventsFromDB(query);
		}

		const cacheKey = AppCacheKeyBuilder.build({
			route: '/audit/events',
			query: {
				eventType: query.eventType ?? '',
				action: query.action ?? '',
				userId: query.userId ?? '',
				resourceType: query.resourceType ?? '',
				resourceId: query.resourceId ?? '',
				limit: query.limit,
				offset: query.offset,
			},
		});

		return this.cache.getOrSet(
			AUDIT_CACHE_NAMESPACE,
			cacheKey,
			AUDIT_CACHE_TTL_MS,
			() => this._findEventsFromDB(query),
			(val) => val,
		);
	}

	private async _findEventsFromDB(query: AuditEventQuery) {
		const queryBuilder = this.repository
			.createQueryBuilder('event')
			.where('1 = 1')
			.orderBy('event.created_at', 'DESC')
			.skip(query.offset)
			.take(query.limit);
		if (query.eventType) {
			queryBuilder.andWhere('event.event_type = :eventType', {
				eventType: query.eventType,
			});
		}
		if (query.action) {
			queryBuilder.andWhere('event.action = :action', { action: query.action });
		}
		if (query.userId) {
			queryBuilder.andWhere(
				'(event.actor_user_id = :userId OR event.subject_user_id = :userId)',
				{ userId: query.userId },
			);
		}
		if (query.resourceType) {
			queryBuilder.andWhere('event.resource_type = :resourceType', {
				resourceType: query.resourceType,
			});
		}
		if (query.resourceId) {
			queryBuilder.andWhere('event.resource_id = :resourceId', {
				resourceId: query.resourceId,
			});
		}
		const [items, total] = await queryBuilder.getManyAndCount();
		return { items, total, limit: query.limit, offset: query.offset };
	}

	private async pruneExpiredEvents(retentionDays: number): Promise<void> {
		if (this.retentionRunInProgress) return;
		this.retentionRunInProgress = true;
		try {
			const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
			for (let batch = 0; batch < 20; batch += 1) {
				const result = (await this.repository.manager.query(
					`DELETE FROM "audit_events"
					 WHERE "id" IN (
					   SELECT "id" FROM "audit_events"
					   WHERE "created_at" < $1
					   ORDER BY "created_at"
					   LIMIT 5000
					 )
					 RETURNING "id"`,
					[cutoff],
				)) as Array<{ id: string }>;
				if (result.length < 5000) break;
			}
		} catch (error) {
			this.logger.warn({ err: error }, 'Audit retention cleanup failed');
		} finally {
			this.retentionRunInProgress = false;
		}
	}
}
