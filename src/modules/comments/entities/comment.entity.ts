import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	JoinColumn,
	CreateDateColumn,
	UpdateDateColumn,
	DeleteDateColumn,
	Index,
} from 'typeorm';
import { User } from '@modules/users/entities/user.entity';

@Entity('comments')
@Index('IDX_comments_post_depth_created_at', ['postId', 'depth', 'createdAt'])
export class Comment {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'text' })
	content: string;

	@Column({ type: 'int', default: 0 })
	depth: number;

	@ManyToOne(() => User, { nullable: false })
	@JoinColumn({ name: 'author_id' })
	author: User;

	@Column({ name: 'post_id', type: 'varchar' })
	postId: string;

	@Column({ name: 'likes_count', type: 'int', default: 0 })
	likesCount: number;

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt: Date;

	@DeleteDateColumn({ name: 'deleted_at' })
	deletedAt: Date;

	replies?: Comment[];
}
