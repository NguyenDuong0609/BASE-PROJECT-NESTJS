import { ForbiddenException } from '@nestjs/common';
import { Comment } from './entities/comment.entity';
import { CommentsService } from './comments.service';

describe('CommentsService', () => {
	let service: CommentsService;
	let commentRepository: Record<string, jest.Mock>;
	let closureRepository: Record<string, jest.Mock>;
	let manager: { getRepository: jest.Mock };

	beforeEach(() => {
		commentRepository = {
			create: jest.fn((value) => ({ ...value, id: 'comment-id' })),
			save: jest.fn(async (value) => value),
			find: jest.fn(),
			findOne: jest.fn(),
			softDelete: jest.fn(),
		};
		closureRepository = {
			create: jest.fn((value) => value),
			save: jest.fn(),
			find: jest.fn(),
			findOne: jest.fn(),
		};
		manager = {
			getRepository: jest.fn((entity) =>
				entity === Comment ? commentRepository : closureRepository,
			),
		};
		Object.assign(commentRepository, {
			manager: {
				transaction: jest.fn((callback) => callback(manager)),
			},
		});
		service = new CommentsService(
			commentRepository as never,
			closureRepository as never,
		);
	});

	it('creates a root comment and its closure entry atomically', async () => {
		const result = await service.createComment(
			{ content: 'Root comment', postId: 'post-id' },
			'user-id',
		);

		expect(result).toMatchObject({
			id: 'comment-id',
			content: 'Root comment',
			postId: 'post-id',
			depth: 0,
			author: { id: 'user-id' },
		});
		expect(closureRepository.save).toHaveBeenCalledWith({
			ancestorId: 'comment-id',
			descendantId: 'comment-id',
			depth: 0,
		});
	});

	it('does not allow replies to cross post boundaries', async () => {
		commentRepository.findOne.mockResolvedValue({
			id: 'parent-id',
			postId: 'different-post',
			depth: 0,
		});

		await expect(
			service.createComment(
				{ content: 'Reply', postId: 'requested-post', parentId: 'parent-id' },
				'user-id',
			),
		).rejects.toBeInstanceOf(ForbiddenException);
	});

	it('allows only the comment author or an admin to delete a comment', async () => {
		commentRepository.findOne.mockResolvedValue({
			id: 'comment-id',
			author: { id: 'owner-id' },
		});

		await expect(
			service.deleteComment('comment-id', 'other-user'),
		).rejects.toBeInstanceOf(ForbiddenException);
	});

	it('soft-deletes an owned comment with its descendants', async () => {
		commentRepository.findOne.mockResolvedValue({
			id: 'comment-id',
			author: { id: 'owner-id' },
		});
		closureRepository.find.mockResolvedValue([]);

		await service.deleteComment('comment-id', 'owner-id');

		expect(commentRepository.softDelete).toHaveBeenCalledWith(['comment-id']);
	});

	it('builds a paginated comment tree with batched closure lookup', async () => {
		const root = { id: 'root-id', postId: 'post-id', depth: 0, replies: [] };
		const reply = { id: 'reply-id', postId: 'post-id', depth: 1, replies: [] };
		commentRepository.find
			.mockResolvedValueOnce([root])
			.mockResolvedValueOnce([root, reply]);
		closureRepository.find.mockResolvedValue([
			{ ancestorId: 'root-id', descendantId: 'root-id', depth: 0 },
			{ ancestorId: 'root-id', descendantId: 'reply-id', depth: 1 },
		]);

		const result = await service.getCommentTree('post-id', 20, 10);

		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('root-id');
		expect(result[0].replies).toEqual([reply]);
		expect(commentRepository.find).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				where: { postId: 'post-id', depth: 0 },
				skip: 20,
				take: 10,
			}),
		);
		expect(closureRepository.find).toHaveBeenCalledTimes(1);
		expect(closureRepository.find).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { ancestorId: expect.anything() },
			}),
		);
	});
});
