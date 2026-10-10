import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	OneToOne,
	JoinColumn,
	UpdateDateColumn,
} from 'typeorm';
import { User } from '@modules/users/entities/user.entity';

@Entity('checkin_stats')
export class CheckinStats {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ name: 'user_id', type: 'uuid' })
	userId: string;

	@OneToOne(() => User, { nullable: false })
	@JoinColumn({ name: 'user_id' })
	user: User;

	@Column({ name: 'total_checkins', type: 'int', default: 0 })
	totalCheckins: number;

	@Column({ name: 'current_streak', type: 'int', default: 0 })
	currentStreak: number;

	@Column({ name: 'longest_streak', type: 'int', default: 0 })
	longestStreak: number;

	@Column({ name: 'total_rewards', type: 'int', default: 0 })
	totalRewards: number;

	@Column({ name: 'last_checkin_date', type: 'date', nullable: true })
	lastCheckinDate: Date | string;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt: Date;
}
