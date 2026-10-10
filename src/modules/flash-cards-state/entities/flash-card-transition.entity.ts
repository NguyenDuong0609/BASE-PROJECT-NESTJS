import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	JoinColumn,
	CreateDateColumn,
} from 'typeorm';
import { FlashCardState } from './flash-card-state.entity';
import { User } from '@modules/users/entities/user.entity';
import { FlashCardStateEnum } from './flash-card-state.entity';

@Entity('flash_card_transitions')
export class FlashCardTransition {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@ManyToOne(() => FlashCardState, (card) => card.transitions, {
		nullable: false,
	})
	@JoinColumn({ name: 'flash_card_id' })
	flashCard: FlashCardState;

	@Column({
		name: 'from_state',
		type: 'enum',
		enum: FlashCardStateEnum,
		enumName: 'flash_card_state_enum',
	})
	fromState: FlashCardStateEnum;

	@Column({
		name: 'to_state',
		type: 'enum',
		enum: FlashCardStateEnum,
		enumName: 'flash_card_state_enum',
	})
	toState: FlashCardStateEnum;

	@ManyToOne(() => User, { nullable: false })
	@JoinColumn({ name: 'transitioned_by' })
	transitionedBy: User;

	@Column({ type: 'text', nullable: true })
	comment: string;

	@CreateDateColumn({ name: 'transitioned_at' })
	transitionedAt: Date;
}
