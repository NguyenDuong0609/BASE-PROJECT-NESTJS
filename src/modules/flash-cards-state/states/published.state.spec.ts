import { BadRequestException } from '@nestjs/common';
import { FlashCardStateEnum } from '../entities/flash-card-state.entity';
import { PublishedState } from './published.state';

describe('PublishedState', () => {
	const state = new PublishedState();

	it('does not allow further transitions', () => {
		expect(state.getStateName()).toBe(FlashCardStateEnum.PUBLISHED);
		expect(state.canTransitionTo(FlashCardStateEnum.DRAFT, [])).toBe(false);
		expect(state.getAllowedTransitions([])).toEqual([]);
	});

	it('does not allow submit, approval, rejection, or republishing', async () => {
		await expect(state.submit()).rejects.toBeInstanceOf(BadRequestException);
		await expect(state.approve()).rejects.toBeInstanceOf(BadRequestException);
		await expect(state.reject()).rejects.toBeInstanceOf(BadRequestException);
		await expect(state.publish()).rejects.toBeInstanceOf(BadRequestException);
	});
});
