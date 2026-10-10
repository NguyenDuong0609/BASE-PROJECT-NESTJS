import { BaseEntity } from '@modules/shared/base/base.entity';
import { Entity, Column, ManyToMany, JoinTable } from 'typeorm';
import { Exclude, Expose } from 'class-transformer';
import { Permission } from '../../permissions/entities/permission.entity';

export enum USER_ROLE {
	ADMIN = 'Admin',
	USER = 'User',
	TEAM_LEADER = 'TeamLeader',
}

@Entity('user_roles')
@Exclude()
export class UserRole extends BaseEntity {
	@ManyToMany(() => Permission, (permission) => permission.roles, {
		eager: true,
	})
	@JoinTable({
		name: 'permission_roles',
		joinColumn: { name: 'role_id', referencedColumnName: 'id' },
		inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
	})
	permissions: Permission[];

	@Column({
		type: 'enum',
		enum: USER_ROLE,
		enumName: 'user_role_enum',
		default: USER_ROLE.USER,
		unique: true,
	})
	@Expose({ name: 'role', toPlainOnly: true })
	name: string;

	@Column({ name: '_description', nullable: true })
	@Expose()
	description: string;
}
