import { BaseEntity } from '@modules/shared/base/base.entity';
import { Column, Entity, Index } from 'typeorm';

@Entity('audit_events')
@Index('IDX_audit_events_subject_created', ['subject_user_id', 'created_at'])
@Index('IDX_audit_events_actor_created', ['actor_user_id', 'created_at'])
@Index('IDX_audit_events_action_created', ['action', 'created_at'])
@Index('IDX_audit_events_created_at', ['created_at'])
@Index('IDX_audit_events_type_created', ['event_type', 'created_at'])
export class AuditEvent extends BaseEntity {
	@Column({ type: 'varchar', length: 20, default: 'security' })
	event_type: 'security' | 'business';

	@Column({ type: 'varchar', length: 80 })
	action: string;

	@Column({ type: 'uuid', nullable: true })
	actor_user_id: string | null;

	@Column({ type: 'uuid', nullable: true })
	subject_user_id: string | null;

	@Column({ type: 'varchar', length: 80, nullable: true })
	resource_type: string | null;

	@Column({ type: 'varchar', length: 255, nullable: true })
	resource_id: string | null;

	@Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
	metadata: Record<string, string | number | boolean | null>;
}
