import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	JoinColumn,
	CreateDateColumn,
	UpdateDateColumn,
	DeleteDateColumn,
} from 'typeorm';
import { User } from '@modules/users/entities/user.entity';

export enum MediaFileStatus {
	PENDING = 'pending',
	PROCESSING = 'processing',
	COMPLETED = 'completed',
	FAILED = 'failed',
}

@Entity('media_files')
export class MediaFile {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'varchar', length: 255 })
	filename: string;

	@Column({ name: 's3_key', type: 'varchar', length: 255, unique: true })
	s3Key: string;

	@Column({ type: 'varchar', length: 100 })
	mimetype: string;

	@Column({ type: 'bigint' })
	size: number;

	@Column({ type: 'varchar', length: 512, nullable: true })
	url: string;

	@Column({
		type: 'enum',
		enum: MediaFileStatus,
		enumName: 'media_file_status_enum',
		default: MediaFileStatus.PENDING,
	})
	status: MediaFileStatus;

	@Column({ type: 'varchar', length: 50 })
	bucket: string;

	@ManyToOne(() => User, { nullable: false })
	@JoinColumn({ name: 'uploaded_by' })
	uploadedBy: User;

	@Column({ type: 'jsonb', nullable: true })
	metadata: Record<string, any>;

	@CreateDateColumn({ name: 'uploaded_at' })
	uploadedAt: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt: Date;

	@DeleteDateColumn({ name: 'deleted_at' })
	deletedAt: Date;
}
