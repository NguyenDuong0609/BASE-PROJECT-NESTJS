import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { USER_ROLE } from '@modules/user-roles/entities/user-role.entity';
import { User } from '@modules/users/entities/user.entity';
import { FlashCardStateEnum } from '../entities/flash-card-state.entity';
import { IFlashCardStateContext } from '../interfaces/state-context.interface';
import { InReviewState } from './in-review.state';

describe('InReviewState', () => {
	const state = new InReviewState();
	const context = {
		transitionTo: jest.fn().mockResolvedValue(undefined),
		getUser: jest.fn(),
	} as unknown as jest.Mocked<IFlashCardStateContext>;

	beforeEach(() => jest.clearAllMocks());

	it('allows reviewers to approve and returns role-appropriate transitions', () => {
		expect(state.getStateName()).toBe(FlashCardStateEnum.IN_REVIEW);
		expect(
			state.canTransitionTo(FlashCardStateEnum.APPROVED_ONE, [
				USER_ROLE.TEAM_LEADER,
			]),
		).toBe(true);
		expect(state.getAllowedTransitions([USER_ROLE.USER])).toEqual([
			FlashCardStateEnum.DRAFT,
		]);
	});

	it('approves as a team leader', async () => {
		context.getUser.mockResolvedValue({
			role: { name: USER_ROLE.TEAM_LEADER },
		} as User);
		await state.approve(context, 'reviewer-id', 'approved');
		expect(context.transitionTo).toHaveBeenCalledWith(
			FlashCardStateEnum.APPROVED_ONE,
			'reviewer-id',
			'approved',
		);
	});

	it('rejects approval by a regular user', async () => {
		context.getUser.mockResolvedValue({
			role: { name: USER_ROLE.USER },
		} as User);
		await expect(state.approve(context, 'user-id')).rejects.toBeInstanceOf(
			ForbiddenException,
		);
	});

	it('does not allow resubmission or publication while in review', async () => {
		await expect(state.submit()).rejects.toBeInstanceOf(BadRequestException);
		await expect(state.publish()).rejects.toBeInstanceOf(BadRequestException);
	});
});
