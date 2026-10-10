import { MediaService } from '@modules/media/services/media.service';
import { CollectionsService } from './collections.service';
import { CollectionsController } from './collections.controller';

jest.mock('@modules/queue/queue.service', () => ({
	QueueService: class QueueService {},
}));

describe('CollectionsController', () => {
	let controller: CollectionsController;
	let service: jest.Mocked<CollectionsService>;

	beforeEach(() => {
		service = {
			create: jest.fn(),
			findAllForUser: jest.fn(),
			findOneForUser: jest.fn(),
			updateForUser: jest.fn(),
			removeForUser: jest.fn(),
		} as unknown as jest.Mocked<CollectionsService>;
		controller = new CollectionsController(service, {} as MediaService);
	});

	it('delegates collection listing with bounded pagination and level filters', () => {
		const user = { id: 'user-id' };

		controller.findAll(0, 100, { user } as never, ['easy', 'hard']);

		expect(service.findAllForUser).toHaveBeenCalledWith(user, 0, 100, [
			'easy',
			'hard',
		]);
	});

	it('scopes a collection lookup to the authenticated user', () => {
		const user = { id: 'user-id' };

		controller.findOne('collection-id', { user } as never);

		expect(service.findOneForUser).toHaveBeenCalledWith('collection-id', user);
	});
});
