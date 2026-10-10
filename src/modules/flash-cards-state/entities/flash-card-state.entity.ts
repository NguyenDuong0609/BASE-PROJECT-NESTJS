import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	JoinColumn,
	OneToMany,
	CreateDateColumn,
	UpdateDateColumn,
	DeleteDateColumn,
} from 'typeorm';
import { User } from '@modules/users/entities/user.entity';
import { FlashCardTransition } from './flash-card-transition.entity';

export enum FlashCardStateEnum {
	DRAFT = 'draft',
	IN_REVIEW = 'in_review',
	APPROVED_ONE = 'approved_one',
	APPROVED_TWO = 'approved_two',
	PUBLISHED = 'published',
}

@Entity('flash_cards_state')
export class FlashCardState {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'varchar', length: 255 })
	title: string;

	@Column({ type: 'text' })
	question: string;

	@Column({ type: 'text' })
	answer: string;

	@Column({
		type: 'enum',
		enum: FlashCardStateEnum,
		enumName: 'flash_card_state_enum',
		default: FlashCardStateEnum.DRAFT,
	})
	state: FlashCardStateEnum;

	@ManyToOne(() => User, { nullable: false })
	@JoinColumn({ name: 'created_by' })
	createdBy: User;

	@OneToMany(() => FlashCardTransition, (transition) => transition.flashCard)
	transitions: FlashCardTransition[];

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt: Date;

	@DeleteDateColumn({ name: 'deleted_at' })
	deletedAt: Date;
}
