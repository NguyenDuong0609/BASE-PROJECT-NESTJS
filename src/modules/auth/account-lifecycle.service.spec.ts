import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { Repository } from 'typeorm';
import { UsersService } from '@modules/users/users.service';
import {
	AccountActionPurpose,
	AccountActionToken,
} from './entities/account-action-token.entity';
import { AccountLifecycleService } from './account-lifecycle.service';
import { EmailDeliveryService } from './email-delivery.service';
import { AuditLogService } from '../../observability/audit-log.service';

describe('AccountLifecycleService', () => {
	let service: AccountLifecycleService;
	let users: jest.Mocked<UsersService>;
	let tokens: jest.Mocked<Repository<AccountActionToken>>;
	let mailer: jest.Mocked<EmailDeliveryService>;
	let auditLog: jest.Mocked<AuditLogService>;
	let tokenRecord: Partial<AccountActionToken>;
	let userRepository: { findOneBy: jest.Mock; save: jest.Mock };
	let manager: { getRepository: jest.Mock };
	let queryBuilder: {
		update: jest.Mock;
		set: jest.Mock;
		where: jest.Mock;
		execute: jest.Mock;
	};

	beforeEach(() => {
		users = {
			getUserByEmail: jest.fn(),
			update: jest.fn(),
		} as unknown as jest.Mocked<UsersService>;
		tokenRecord = {};
		queryBuilder = {
			update: jest.fn().mockReturnThis(),
			set: jest.fn().mockReturnThis(),
			where: jest.fn().mockReturnThis(),
			execute: jest.fn().mockResolvedValue({ affected: 1 }),
		};
		tokens = {
			delete: jest.fn().mockResolvedValue(undefined),
			create: jest.fn((value) => {
				tokenRecord = value;
				return value;
			}),
			save: jest.fn().mockImplementation(async (value) => value),
			findOne: jest.fn(),
			createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
		} as unknown as jest.Mocked<Repository<AccountActionToken>>;
		userRepository = {
			findOneBy: jest.fn().mockResolvedValue({ id: 'user-1' }),
			save: jest.fn(async (user) => user),
		};
		manager = {
			getRepository: jest.fn((entity) =>
				entity === AccountActionToken ? tokens : userRepository,
			),
		};
		Object.defineProperty(tokens, 'manager', {
			value: {
				transaction: jest.fn(async (callback) => callback(manager)),
			},
		});
		mailer = {
			sendAccountAction: jest.fn().mockResolvedValue(undefined),
		} as unknown as jest.Mocked<EmailDeliveryService>;
		auditLog = {
			record: jest.fn().mockResolvedValue(undefined),
		} as unknown as jest.Mocked<AuditLogService>;
		const config = {
			getOrThrow: jest.fn().mockReturnValue('https://app.example.test'),
		} as unknown as ConfigService;
		service = new AccountLifecycleService(
			users,
			config,
			mailer,
			auditLog,
			tokens,
		);
	});

	it('stores only a hash and sends a password reset link', async () => {
		users.getUserByEmail.mockResolvedValue({
			id: 'user-1',
			email: 'user@example.test',
		} as never);

		await service.requestPasswordReset('user@example.test');

		expect(tokenRecord).toEqual(
			expect.objectContaining({
				user_id: 'user-1',
				purpose: AccountActionPurpose.PASSWORD_RESET,
				token_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
				expires_at: expect.any(Date),
				consumed_at: null,
			}),
		);
		const url = new URL(mailer.sendAccountAction.mock.calls[0][2]);
		const token = url.searchParams.get('token');
		expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(tokenRecord.token_hash).toBe(
			createHash('sha256').update(token).digest('hex'),
		);
	});

	it('does not disclose or send for an unknown account', async () => {
		users.getUserByEmail.mockRejectedValue(new NotFoundException());

		await expect(
			service.requestPasswordReset('missing@example.test'),
		).resolves.toBeUndefined();
		expect(mailer.sendAccountAction).not.toHaveBeenCalled();
	});

	it('consumes a reset token and revokes the refresh token', async () => {
		const token = 'account-action-token';
		tokens.findOne.mockResolvedValue({
			id: 'action-1',
			user_id: 'user-1',
			expires_at: new Date(Date.now() + 60_000),
			consumed_at: null,
		} as AccountActionToken);

		await service.resetPassword(token, 'StrongPassword1!');

		expect(queryBuilder.where).toHaveBeenCalledWith(
			expect.stringContaining('"consumed_at" IS NULL'),
			expect.objectContaining({ id: 'action-1' }),
		);
		expect(userRepository.save).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'user-1',
				password: 'StrongPassword1!',
				current_refresh_token: null,
			}),
		);
		expect(auditLog.record).toHaveBeenCalledWith(
			'ACCOUNT_PASSWORD_RESET',
			'user-1',
			null,
			{},
			manager,
		);
	});

	it('rejects expired, consumed, or replayed action tokens', async () => {
		tokens.findOne.mockResolvedValue({
			id: 'action-1',
			expires_at: new Date(Date.now() - 1),
			consumed_at: null,
		} as AccountActionToken);

		await expect(service.verifyEmail('expired-token')).rejects.toThrow(
			'Invalid or expired account action token',
		);
		expect(queryBuilder.execute).not.toHaveBeenCalled();
	});
});
