import { ApiException } from '../../shared/api-errors';
import {
	FlashCardState,
	FlashCardStateEnum,
} from './entities/flash-card-state.entity';
import { FlashCardContext } from './states/flash-card-context';
import { DraftState } from './states/draft.state';
import { InReviewState } from './states/in-review.state';
import { ApprovedOneState } from './states/approved-one.state';
import { ApprovedTwoState } from './states/approved-two.state';
import { PublishedState } from './states/published.state';

describe('FlashCardContext', () => {
	const flashCardRepository = { findOne: jest.fn() };
	const transitionRepository = {};
	const userRepository = { findOne: jest.fn() };
	let context: FlashCardContext;

	beforeEach(() => {
		jest.clearAllMocks();
		userRepository.findOne.mockResolvedValue({ role: { name: 'user' } });
		context = new FlashCardContext(
			flashCardRepository as never,
			transitionRepository as never,
			userRepository as never,
			new DraftState(),
			new InReviewState(),
			new ApprovedOneState(),
			new ApprovedTwoState(),
			new PublishedState(),
		);
	});

	it('loads a flash card and selects its state implementation', async () => {
		const card = {
			id: 'card-id',
			state: FlashCardStateEnum.DRAFT,
		} as FlashCardState;
		flashCardRepository.findOne.mockResolvedValue(card);

		await context.loadFlashCard(card.id);

		expect(flashCardRepository.findOne).toHaveBeenCalledWith({
			where: { id: card.id },
			relations: ['createdBy'],
		});
		expect(context.getCurrentState()).toBe(FlashCardStateEnum.DRAFT);
		expect(context.getCurrentStateObject()).toBeInstanceOf(DraftState);
	});

	it('reports a missing card', async () => {
		flashCardRepository.findOne.mockResolvedValue(null);
		await expect(context.loadFlashCard('missing')).rejects.toBeInstanceOf(
			ApiException,
		);
	});

	it('does not transition a draft directly to published', async () => {
		const card = {
			id: 'card-id',
			state: FlashCardStateEnum.DRAFT,
		} as FlashCardState;
		flashCardRepository.findOne.mockResolvedValue(card);
		await context.loadFlashCard(card.id);

		await expect(
			context.transitionTo(FlashCardStateEnum.PUBLISHED, 'user-id'),
		).rejects.toThrow('Cannot transition from draft to published');
	});
});
