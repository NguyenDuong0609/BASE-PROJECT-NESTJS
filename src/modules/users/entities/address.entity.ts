import { BaseEntity } from '@modules/shared/base/base.entity';
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { User } from './user.entity';

@Entity('addresses')
export class Address extends BaseEntity {
	@Column({ length: 120, nullable: true })
	street?: string;

	@Column({ length: 50 })
	state: string;

	@Column({ length: 50 })
	city: string;

	@Column({ name: 'postal_code', nullable: true })
	@Exclude()
	postal_code?: number;

	@Column({ length: 50 })
	country: string;

	@ManyToOne(() => User, (user) => user.address, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id' })
	user: User;
}
