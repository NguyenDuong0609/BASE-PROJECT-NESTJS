import { BaseEntity } from '@modules/shared/base/base.entity';
import { Entity, Column } from 'typeorm';

@Entity('topics')
export class Topic extends BaseEntity {
	@Column({ unique: true })
	name: string;

	@Column({ nullable: true })
	description: string;
}
