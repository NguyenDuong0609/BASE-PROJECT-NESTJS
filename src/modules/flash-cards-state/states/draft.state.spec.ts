import { BadRequestException } from '@nestjs/common';
import { FlashCardStateEnum } from '../entities/flash-card-state.entity';
import { DraftState } from './draft.state';
import { IFlashCardStateContext } from '../interfaces/state-context.interface';

describe('DraftState', () => {
	const state = new DraftState();
	const context = {
		transitionTo: jest.fn().mockResolvedValue(undefined),
	} as unknown as IFlashCardStateContext;

	beforeEach(() => jest.clearAllMocks());

	it('only allows submission for review', () => {
		expect(state.getStateName()).toBe(FlashCardStateEnum.DRAFT);
		expect(state.canTransitionTo(FlashCardStateEnum.IN_REVIEW, [])).toBe(true);
		expect(state.canTransitionTo(FlashCardStateEnum.APPROVED_ONE, [])).toBe(
			false,
		);
		expect(state.getAllowedTransitions([])).toEqual([
			FlashCardStateEnum.IN_REVIEW,
		]);
	});

	it('transitions to in-review on submit', async () => {
		await state.submit(context, 'submitter-id', 'ready');
		expect(context.transitionTo).toHaveBeenCalledWith(
			FlashCardStateEnum.IN_REVIEW,
			'submitter-id',
			'ready',
		);
	});

	it('does not allow approval, rejection, or direct publication', async () => {
		await expect(state.approve()).rejects.toBeInstanceOf(BadRequestException);
		await expect(state.reject()).rejects.toBeInstanceOf(BadRequestException);
		await expect(state.publish()).rejects.toBeInstanceOf(BadRequestException);
	});
});
