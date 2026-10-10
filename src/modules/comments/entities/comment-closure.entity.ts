import {
	Entity,
	PrimaryColumn,
	Column,
	ManyToOne,
	JoinColumn,
	Index,
} from 'typeorm';
import { Comment } from './comment.entity';

@Entity('comment_closures')
@Index(['ancestorId', 'descendantId'], { unique: true })
@Index(['descendantId'])
export class CommentClosure {
	@PrimaryColumn({ name: 'ancestor_id', type: 'uuid' })
	ancestorId: string;

	@PrimaryColumn({ name: 'descendant_id', type: 'uuid' })
	descendantId: string;

	@Column({ type: 'int' })
	depth: number;

	@ManyToOne(() => Comment, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'ancestor_id' })
	ancestor: Comment;

	@ManyToOne(() => Comment, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'descendant_id' })
	descendant: Comment;
}
