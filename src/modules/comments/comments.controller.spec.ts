import { Test } from '@nestjs/testing';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { createAutoMock, createCommentStub } from '@test-utils';

describe('CommentsController', () => {
	let controller: CommentsController;
	let service: jest.Mocked<CommentsService>;

	beforeEach(async () => {
		const module = await Test.createTestingModule({
			controllers: [CommentsController],
			providers: [
				{
					provide: CommentsService,
					useValue: createAutoMock<CommentsService>(CommentsService),
				},
			],
		}).compile();

		controller = module.get<CommentsController>(CommentsController);
		service = module.get(CommentsService);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	describe('createRootComment', () => {
		it('should create root comment', async () => {
			service.createComment = jest.fn().mockResolvedValue(createCommentStub());
			const result = await controller.createRootComment(
				'1',
				{ content: 'Test comment' },
				'1',
			);
			expect(result).toBeDefined();
		});
	});

	describe('getCommentTree', () => {
		it('should return comment tree', async () => {
			service.getCommentTree = jest.fn().mockResolvedValue([]);
			const result = await controller.getCommentTree('1');
			expect(Array.isArray(result)).toBe(true);
		});
	});
});
