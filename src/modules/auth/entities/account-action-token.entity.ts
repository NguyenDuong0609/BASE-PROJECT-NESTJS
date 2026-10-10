import { BaseEntity } from '@modules/shared/base/base.entity';
import { Column, Entity, Index } from 'typeorm';

export enum AccountActionPurpose {
	EMAIL_VERIFICATION = 'email_verification',
	PASSWORD_RESET = 'password_reset',
}

@Entity('account_action_tokens')
@Index('UQ_account_action_tokens_token_hash', ['token_hash'], { unique: true })
@Index('IDX_account_action_tokens_expires_at', ['expires_at'])
@Index('IDX_account_action_tokens_user_purpose', ['user_id', 'purpose'])
export class AccountActionToken extends BaseEntity {
	@Column({ type: 'uuid' })
	user_id: string;

	@Column({
		type: 'enum',
		enum: AccountActionPurpose,
		enumName: 'account_action_token_purpose_enum',
	})
	purpose: AccountActionPurpose;

	@Column({ type: 'char', length: 64 })
	token_hash: string;

	@Column({ type: 'timestamptz' })
	expires_at: Date;

	@Column({ type: 'timestamptz', nullable: true })
	consumed_at: Date | null;
}
