import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { USER_ROLE } from '@modules/user-roles/entities/user-role.entity';
import { User } from '@modules/users/entities/user.entity';
import { FlashCardStateEnum } from '../entities/flash-card-state.entity';
import { IFlashCardStateContext } from '../interfaces/state-context.interface';
import { ApprovedTwoState } from './approved-two.state';

describe('ApprovedTwoState', () => {
	const state = new ApprovedTwoState();
	const context = {
		transitionTo: jest.fn().mockResolvedValue(undefined),
		getUser: jest.fn(),
	} as unknown as jest.Mocked<IFlashCardStateContext>;

	beforeEach(() => jest.clearAllMocks());

	it('allows only admins to publish', () => {
		expect(state.getStateName()).toBe(FlashCardStateEnum.APPROVED_TWO);
		expect(
			state.canTransitionTo(FlashCardStateEnum.PUBLISHED, [USER_ROLE.ADMIN]),
		).toBe(true);
		expect(state.getAllowedTransitions([USER_ROLE.USER])).toEqual([
			FlashCardStateEnum.DRAFT,
		]);
	});

	it('publishes for an admin', async () => {
		context.getUser.mockResolvedValue({
			role: { name: USER_ROLE.ADMIN },
		} as User);
		await state.publish(context, 'admin-id', 'release');
		expect(context.transitionTo).toHaveBeenCalledWith(
			FlashCardStateEnum.PUBLISHED,
			'admin-id',
			'release',
		);
	});

	it('rejects publication by a non-admin', async () => {
		context.getUser.mockResolvedValue({
			role: { name: USER_ROLE.TEAM_LEADER },
		} as User);
		await expect(state.publish(context, 'reviewer-id')).rejects.toBeInstanceOf(
			ForbiddenException,
		);
	});

	it('does not allow another approval after two approvals', async () => {
		await expect(state.approve()).rejects.toBeInstanceOf(BadRequestException);
	});
});
