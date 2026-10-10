import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { USER_ROLE } from '@modules/user-roles/entities/user-role.entity';
import { User } from '@modules/users/entities/user.entity';
import { FlashCardStateEnum } from '../entities/flash-card-state.entity';
import { IFlashCardStateContext } from '../interfaces/state-context.interface';
import { ApprovedOneState } from './approved-one.state';

describe('ApprovedOneState', () => {
	const state = new ApprovedOneState();
	const context = {
		transitionTo: jest.fn().mockResolvedValue(undefined),
		getUser: jest.fn(),
	} as unknown as jest.Mocked<IFlashCardStateContext>;

	beforeEach(() => jest.clearAllMocks());

	it('allows only admins to advance a second approval', () => {
		expect(state.getStateName()).toBe(FlashCardStateEnum.APPROVED_ONE);
		expect(
			state.canTransitionTo(FlashCardStateEnum.APPROVED_TWO, [USER_ROLE.ADMIN]),
		).toBe(true);
		expect(state.getAllowedTransitions([USER_ROLE.TEAM_LEADER])).toEqual([
			FlashCardStateEnum.DRAFT,
		]);
	});

	it('transitions to second approval for an admin', async () => {
		context.getUser.mockResolvedValue({
			role: { name: USER_ROLE.ADMIN },
		} as User);
		await state.approve(context, 'admin-id');
		expect(context.transitionTo).toHaveBeenCalledWith(
			FlashCardStateEnum.APPROVED_TWO,
			'admin-id',
			undefined,
		);
	});

	it('rejects second approval by a non-admin', async () => {
		context.getUser.mockResolvedValue({
			role: { name: USER_ROLE.TEAM_LEADER },
		} as User);
		await expect(state.approve(context, 'reviewer-id')).rejects.toBeInstanceOf(
			ForbiddenException,
		);
	});

	it('does not allow publication before the second approval', async () => {
		await expect(state.publish()).rejects.toBeInstanceOf(BadRequestException);
	});
});
