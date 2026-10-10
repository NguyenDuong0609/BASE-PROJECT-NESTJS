import { BaseEntity } from '@modules/shared/base/base.entity';
import { Topic } from '@modules/topics/entities/topic.entity';
import { User } from '@modules/users/entities/user.entity';
import {
	Entity,
	Column,
	ManyToOne,
	ManyToMany,
	JoinTable,
	JoinColumn,
} from 'typeorm';

@Entity('flash_cards')
export class FlashCard extends BaseEntity {
	@Column()
	vocabulary: string;

	@Column()
	image: string;

	@Column()
	definition: string;

	@Column()
	meaning: string;

	@Column({ nullable: true })
	pronunciation?: string;

	@Column('simple-array', { nullable: true })
	examples: string[];

	@Column({ name: 'is_public', default: false })
	is_public: boolean;

	@ManyToOne(() => User, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id' })
	user: User;

	@ManyToMany(() => Topic)
	@JoinTable({
		name: 'flash_cards_topics',
		joinColumn: { name: 'flash_card_id', referencedColumnName: 'id' },
		inverseJoinColumn: { name: 'topic_id', referencedColumnName: 'id' },
	})
	topics: Topic[];
}
