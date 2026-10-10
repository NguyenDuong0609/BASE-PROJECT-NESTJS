import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { EntityManager, LessThan, Repository } from 'typeorm';
import { User } from '@modules/users/entities/user.entity';
import { UsersService } from '@modules/users/users.service';
import {
	AccountActionPurpose,
	AccountActionToken,
} from './entities/account-action-token.entity';
import { EmailDeliveryService } from './email-delivery.service';
import { AuditLogService } from '../../observability/audit-log.service';

const ACCOUNT_ACTION_TOKEN_ERROR = 'Invalid or expired account action token';

@Injectable()
export class AccountLifecycleService {
	constructor(
		private readonly users: UsersService,
		private readonly config: ConfigService,
		private readonly mailer: EmailDeliveryService,
		private readonly auditLog: AuditLogService,
		@InjectRepository(AccountActionToken)
		private readonly tokens: Repository<AccountActionToken>,
	) {}

	async requestPasswordReset(email: string): Promise<void> {
		const user = await this.findUserWithoutEnumeration(email);
		if (!user) return;
		await this.issueToken(user, AccountActionPurpose.PASSWORD_RESET);
	}

	async resetPassword(token: string, password: string): Promise<void> {
		await this.tokens.manager.transaction(async (manager) => {
			const action = await this.consumeToken(
				token,
				AccountActionPurpose.PASSWORD_RESET,
				manager,
			);
			const users = manager.getRepository(User);
			const user = await users.findOneBy({ id: action.user_id });
			if (!user) throw new BadRequestException(ACCOUNT_ACTION_TOKEN_ERROR);
			user.password = password;
			user.current_refresh_token = null;
			await users.save(user);
			await this.auditLog.record(
				'ACCOUNT_PASSWORD_RESET',
				action.user_id,
				null,
				{},
				manager,
			);
		});
	}

	async requestEmailVerification(email: string): Promise<void> {
		const user = await this.findUserWithoutEnumeration(email);
		if (!user || user.isEmailVerified) return;
		await this.issueToken(user, AccountActionPurpose.EMAIL_VERIFICATION);
	}

	async verifyEmail(token: string): Promise<void> {
		await this.tokens.manager.transaction(async (manager) => {
			const action = await this.consumeToken(
				token,
				AccountActionPurpose.EMAIL_VERIFICATION,
				manager,
			);
			const users = manager.getRepository(User);
			const user = await users.findOneBy({ id: action.user_id });
			if (!user) throw new BadRequestException(ACCOUNT_ACTION_TOKEN_ERROR);
			user.isEmailVerified = true;
			await users.save(user);
			await this.auditLog.record(
				'ACCOUNT_EMAIL_VERIFIED',
				action.user_id,
				null,
				{},
				manager,
			);
		});
	}

	private async findUserWithoutEnumeration(
		email: string,
	): Promise<User | null> {
		try {
			return await this.users.getUserByEmail(email.trim().toLowerCase());
		} catch (error) {
			if (error instanceof NotFoundException) return null;
			throw error;
		}
	}

	private async issueToken(
		user: User,
		purpose: AccountActionPurpose,
	): Promise<void> {
		const now = new Date();
		await this.tokens.delete({ expires_at: LessThan(now) });
		await this.tokens.delete({ user_id: user.id, purpose });

		const token = randomBytes(32).toString('base64url');
		const lifetime =
			purpose === AccountActionPurpose.PASSWORD_RESET
				? 30 * 60 * 1000
				: 24 * 60 * 60 * 1000;
		await this.tokens.save(
			this.tokens.create({
				user_id: user.id,
				purpose,
				token_hash: this.hashToken(token),
				expires_at: new Date(now.getTime() + lifetime),
				consumed_at: null,
			}),
		);

		const path =
			purpose === AccountActionPurpose.PASSWORD_RESET
				? '/auth/password-reset'
				: '/auth/email-verification';
		const url = new URL(path, this.config.getOrThrow<string>('frontend.url'));
		url.searchParams.set('token', token);
		await this.mailer.sendAccountAction(
			user.email,
			purpose === AccountActionPurpose.PASSWORD_RESET
				? 'Reset your password'
				: 'Verify your email address',
			url.toString(),
		);
	}

	private async consumeToken(
		token: string,
		purpose: AccountActionPurpose,
		manager: EntityManager,
	): Promise<AccountActionToken> {
		const tokenHash = this.hashToken(token);
		const tokens = manager.getRepository(AccountActionToken);
		const action = await tokens.findOne({
			where: { token_hash: tokenHash, purpose },
		});
		const now = new Date();
		if (!action || action.consumed_at || action.expires_at <= now) {
			throw new BadRequestException(ACCOUNT_ACTION_TOKEN_ERROR);
		}

		const consumed = await tokens
			.createQueryBuilder()
			.update(AccountActionToken)
			.set({ consumed_at: now })
			.where('"id" = :id AND "consumed_at" IS NULL AND "expires_at" > :now', {
				id: action.id,
				now,
			})
			.execute();
		if (consumed.affected !== 1) {
			throw new BadRequestException(ACCOUNT_ACTION_TOKEN_ERROR);
		}
		return action;
	}

	private hashToken(token: string): string {
		return createHash('sha256').update(token).digest('hex');
	}
}
