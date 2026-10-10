import { BaseEntity } from '@modules/shared/base/base.entity';
import { Column, Entity, ManyToMany } from 'typeorm';
import { UserRole } from '../../user-roles/entities/user-role.entity';

@Entity('permissions')
export class Permission extends BaseEntity {
	@Column({ type: 'varchar', length: 120, unique: true })
	code: string;

	@Column({ type: 'varchar', length: 255 })
	description: string;

	@ManyToMany(() => UserRole, (role) => role.permissions)
	roles: UserRole[];
}
