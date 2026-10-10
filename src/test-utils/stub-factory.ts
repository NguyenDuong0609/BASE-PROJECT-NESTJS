import { User } from '@modules/users/entities/user.entity';
import { UserRole } from '@modules/user-roles/entities/user-role.entity';
import { FlashCard } from '@modules/flash-cards/entities/flash-card.entity';
import { FlashCardState } from '@modules/flash-cards-state/entities/flash-card-state.entity';
import { Comment } from '@modules/comments/entities/comment.entity';
import { Checkin } from '@modules/checkin/entities/checkin.entity';
import { CheckinStats } from '@modules/checkin/entities/checkin-stats.entity';
import {
	MediaFile,
	MediaFileStatus,
} from '@modules/media/entities/media-file.entity';
import { Topic } from '@modules/topics/entities/topic.entity';
import { Collection } from '@modules/collections/entities/collection.entity';

/**
 * Factory functions for creating test data (stubs)
 * These functions create partial objects that can be used in tests
 */

let idCounter = 1;

/**
 * Generate a unique UUID for testing
 */
export function generateUUID(): string {
	// Generate a proper UUID v4 format for testing
	// Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
	const counter = idCounter++;
	const paddedCounter = counter.toString().padStart(12, '0');
	return `00000000-0000-4000-8000-${paddedCounter}`;
}

/**
 * Reset ID counter (call in beforeEach)
 */
export function resetIdCounter(): void {
	idCounter = 1;
}

/**
 * Create a test User stub
 */
export function createUserStub(overrides?: Partial<User>): Partial<User> {
	return {
		id: generateUUID(),
		email: `test${idCounter}@example.com`,
		username: `testuser${idCounter}`,
		first_name: 'Test',
		last_name: 'User',
		password: '$2a$10$hashed.password.here', // bcrypt hash
		isEmailVerified: true,
		authProvider: 'local' as any,
		point: 0,
		created_at: new Date(),
		updated_at: new Date(),
		...overrides,
	};
}

/**
 * Create a test UserRole stub
 */
export function createUserRoleStub(
	overrides?: Partial<UserRole>,
): Partial<UserRole> {
	return {
		id: generateUUID(),
		name: 'User' as any,
		description: 'Regular user role',
		created_at: new Date(),
		updated_at: new Date(),
		...overrides,
	};
}

/**
 * Create a test Admin role stub
 */
export function createAdminRoleStub(
	overrides?: Partial<UserRole>,
): Partial<UserRole> {
	return {
		id: generateUUID(),
		name: 'Admin' as any,
		description: 'Administrator role',
		created_at: new Date(),
		updated_at: new Date(),
		...overrides,
	};
}

/**
 * Create a test FlashCard stub
 */
export function createFlashCardStub(
	overrides?: Partial<FlashCard>,
): Partial<FlashCard> {
	return {
		id: generateUUID(),
		vocabulary: 'NestJS',
		definition: 'A progressive Node.js framework',
		meaning: 'Framework for building server-side applications',
		image: 'https://example.com/nestjs.png',
		is_public: true,
		created_at: new Date(),
		updated_at: new Date(),
		...overrides,
	};
}

/**
 * Create a test FlashCardState stub (State pattern workflow)
 */
export function createFlashCardStateStub(
	overrides?: Partial<FlashCardState>,
): Partial<FlashCardState> {
	return {
		id: generateUUID(),
		title: 'Test Flash Card',
		question: 'What is TypeORM?',
		answer: 'An ORM for TypeScript',
		state: 'draft' as any,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

/**
 * Create a test Comment stub
 */
export function createCommentStub(
	overrides?: Partial<Comment>,
): Partial<Comment> {
	return {
		id: generateUUID(),
		content: 'This is a test comment',
		depth: 0,
		postId: 'post-123',
		likesCount: 0,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

/**
 * Create a test Checkin stub
 */
export function createCheckinStub(
	overrides?: Partial<Checkin>,
): Partial<Checkin> {
	return {
		id: generateUUID(),
		checkinDate: new Date(),
		streakCount: 1,
		rewardsEarned: 10,
		metadata: {},
		createdAt: new Date(),
		...overrides,
	};
}

/**
 * Create a test CheckinStats stub
 */
export function createCheckinStatsStub(
	overrides?: Partial<CheckinStats>,
): Partial<CheckinStats> {
	return {
		id: generateUUID(),
		totalCheckins: 0,
		currentStreak: 0,
		longestStreak: 0,
		totalRewards: 0,
		lastCheckinDate: null,
		updatedAt: new Date(),
		...overrides,
	};
}

/**
 * Create a test MediaFile stub
 */
export function createMediaFileStub(
	overrides?: Partial<MediaFile>,
): Partial<MediaFile> {
	return {
		id: generateUUID(),
		filename: 'test-file.jpg',
		s3Key: `uploads/${generateUUID()}.jpg`,
		mimetype: 'image/jpeg',
		size: 1024000,
		url: 'https://s3.amazonaws.com/bucket/test.jpg',
		status: MediaFileStatus.COMPLETED,
		bucket: 'test-bucket',
		metadata: {},
		uploadedAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

/**
 * Create a test Topic stub
 */
export function createTopicStub(overrides?: Partial<Topic>): Partial<Topic> {
	return {
		id: generateUUID(),
		name: 'JavaScript',
		created_at: new Date(),
		updated_at: new Date(),
		...overrides,
	};
}

/**
 * Create a test Collection stub
 */
export function createCollectionStub(
	overrides?: Partial<Collection>,
): Partial<Collection> {
	return {
		id: generateUUID(),
		name: 'My Test Collection',
		description: 'A collection for testing',
		is_public: false,
		created_at: new Date(),
		updated_at: new Date(),
		...overrides,
	};
}

/**
 * Create a JWT payload stub
 */
export function createJwtPayloadStub(overrides?: any): any {
	return {
		sub: generateUUID(),
		email: 'test@example.com',
		roles: ['User'],
		iat: Math.floor(Date.now() / 1000),
		exp: Math.floor(Date.now() / 1000) + 3600,
		...overrides,
	};
}

/**
 * Create a mock Express Request object
 */
export function createMockRequest(overrides?: any): any {
	return {
		user: createUserStub(),
		body: {},
		params: {},
		query: {},
		headers: {},
		...overrides,
	};
}

/**
 * Create a mock Express Response object
 */
export function createMockResponse(): any {
	const res: any = {
		status: jest.fn().mockReturnThis(),
		json: jest.fn().mockReturnThis(),
		send: jest.fn().mockReturnThis(),
		redirect: jest.fn().mockReturnThis(),
	};
	return res;
}
