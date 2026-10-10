import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	JoinColumn,
	CreateDateColumn,
	Index,
} from 'typeorm';
import { User } from '@modules/users/entities/user.entity';

@Entity('checkins')
@Index(['userId', 'checkinDate'], { unique: true })
export class Checkin {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ name: 'user_id', type: 'uuid' })
	userId: string;

	@ManyToOne(() => User, { nullable: false })
	@JoinColumn({ name: 'user_id' })
	user: User;

	@Column({ name: 'checkin_date', type: 'date' })
	checkinDate: Date;

	@Column({ name: 'streak_count', type: 'int' })
	streakCount: number;

	@Column({ name: 'rewards_earned', type: 'int' })
	rewardsEarned: number;

	@Column({ type: 'jsonb', nullable: true })
	metadata: Record<string, any>;

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;
}
