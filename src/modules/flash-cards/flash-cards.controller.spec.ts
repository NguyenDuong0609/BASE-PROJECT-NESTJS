import { MediaService } from '@modules/media/services/media.service';
import { FlashCardsService } from './flash-cards.service';
import { FlashCardsController } from './flash-cards.controller';
import { createFlashCardStub } from '@test-utils';

jest.mock('@modules/queue/queue.service', () => ({
	QueueService: class QueueService {},
}));

describe('FlashCardsController', () => {
	let controller: FlashCardsController;
	let service: jest.Mocked<FlashCardsService>;
	let mediaService: jest.Mocked<MediaService>;

	beforeEach(() => {
		service = {
			create: jest.fn(),
			findAllForUser: jest.fn(),
			findOneForUser: jest.fn(),
			updateForUser: jest.fn(),
			removeForUser: jest.fn(),
		} as unknown as jest.Mocked<FlashCardsService>;
		mediaService = {
			uploadFile: jest.fn(),
			deleteFile: jest.fn(),
		} as unknown as jest.Mocked<MediaService>;
		controller = new FlashCardsController(service, mediaService);
	});

	it('creates a flash card with the authenticated owner and provided image', async () => {
		const user = { id: 'user-id' };
		const dto = { image: 'media-id', vocabulary: 'word' };
		const card = createFlashCardStub();
		service.create.mockResolvedValue(card as never);

		await expect(
			controller.create({ user } as never, undefined, dto as never),
		).resolves.toBe(card);
		expect(service.create).toHaveBeenCalledWith({
			...dto,
			user,
			image: 'media-id',
		});
	});

	it('rejects creation when the request has no image', async () => {
		await expect(
			controller.create({ user: { id: 'user-id' } } as never, undefined, {
				vocabulary: 'word',
			} as never),
		).rejects.toThrow('An image file is required');
		expect(service.create).not.toHaveBeenCalled();
	});

	it('uses the authenticated user when listing their cards', () => {
		const user = { id: 'user-id' };

		controller.findAll({ user } as never);

		expect(service.findAllForUser).toHaveBeenCalledWith(user);
	});
});
