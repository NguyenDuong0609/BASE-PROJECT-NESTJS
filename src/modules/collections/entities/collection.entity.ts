import { BaseEntity } from '@modules/shared/base/base.entity';
import { User } from '@modules/users/entities/user.entity';
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';

export enum COLLECTION_LEVEL {
	EASY = 'easy',
	MEDIUM = 'medium',
	HARD = 'hard',
	CHAOS = 'chaos',
}

@Entity('collections')
export class Collection extends BaseEntity {
	@Column()
	name: string;

	@Column({ nullable: true })
	description: string;

	@Column({
		type: 'enum',
		enum: COLLECTION_LEVEL,
		enumName: 'collection_level_enum',
		default: COLLECTION_LEVEL.EASY,
	})
	level: COLLECTION_LEVEL;

	@Column({ nullable: true })
	order: number;

	@Column({ nullable: true })
	image: string;

	@Column({ name: 'total_flash_cards', default: 0 })
	total_flash_cards: number;

	@Column({ name: 'is_public', default: false })
	is_public: boolean;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id' })
	user: User;
}
