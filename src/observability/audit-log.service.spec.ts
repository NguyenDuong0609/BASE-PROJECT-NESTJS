import { PinoLogger } from 'nestjs-pino';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AuditEvent } from './audit-event.entity';
import { AuditLogService } from './audit-log.service';
import { ConfigService } from '@nestjs/config';

describe('AuditLogService', () => {
	let service: AuditLogService;
	let repository: jest.Mocked<Repository<AuditEvent>>;
	let logger: jest.Mocked<PinoLogger>;

	beforeEach(() => {
		repository = {
			create: jest.fn((event) => event as AuditEvent),
			save: jest.fn(
				async (event) => ({ ...event, id: 'event-id' }) as AuditEvent,
			),
			createQueryBuilder: jest.fn(),
		} as unknown as jest.Mocked<Repository<AuditEvent>>;
		logger = { info: jest.fn() } as unknown as jest.Mocked<PinoLogger>;
		service = new AuditLogService(repository, logger, {
			get: jest.fn().mockReturnValue(0),
		} as unknown as ConfigService);
	});

	it('persists and emits a sanitized structured application event', async () => {
		await service.recordEvent({
			eventType: 'business',
			action: 'CHECKIN_RECORDED',
			actorUserId: 'actor-id',
			subjectUserId: 'subject-id',
			resourceType: 'Checkin',
			resourceId: 'checkin-id',
			metadata: { streakCount: 3 },
		});

		expect(repository.save).toHaveBeenCalledWith(
			expect.objectContaining({
				event_type: 'business',
				action: 'CHECKIN_RECORDED',
				actor_user_id: 'actor-id',
				resource_type: 'Checkin',
			}),
		);
		expect(logger.info).toHaveBeenCalledWith(
			expect.objectContaining({
				event: 'audit_event',
				auditEventId: 'event-id',
			}),
			'Audit event recorded',
		);
	});

	it('rejects sensitive metadata before persisting or logging it', async () => {
		await expect(
			service.recordEvent({
				action: 'AUTH_SIGN_IN',
				metadata: { accessToken: 'never-store-this' },
			}),
		).rejects.toThrow('Sensitive audit metadata key is not allowed');
		expect(repository.save).not.toHaveBeenCalled();
		expect(logger.info).not.toHaveBeenCalled();
	});

	it('filters by actor or subject as well as event properties', async () => {
		const queryBuilder = {
			where: jest.fn().mockReturnThis(),
			orderBy: jest.fn().mockReturnThis(),
			skip: jest.fn().mockReturnThis(),
			take: jest.fn().mockReturnThis(),
			andWhere: jest.fn().mockReturnThis(),
			getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
		};
		repository.createQueryBuilder.mockReturnValue(
			queryBuilder as unknown as SelectQueryBuilder<AuditEvent>,
		);

		await service.findEvents({
			eventType: 'security',
			action: 'USER_UPDATED',
			userId: 'user-id',
			resourceType: 'User',
			resourceId: 'user-id',
			limit: 25,
			offset: 0,
		});

		expect(queryBuilder.andWhere).toHaveBeenCalledWith(
			'(event.actor_user_id = :userId OR event.subject_user_id = :userId)',
			{ userId: 'user-id' },
		);
		expect(queryBuilder.getManyAndCount).toHaveBeenCalled();
	});
});
