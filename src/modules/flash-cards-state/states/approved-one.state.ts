import {
	Injectable,
	BadRequestException,
	ForbiddenException,
} from '@nestjs/common';
import { IFlashCardState } from './flash-card-state.interface';
import { FlashCardStateEnum } from '../entities/flash-card-state.entity';
import { IFlashCardStateContext } from '../interfaces/state-context.interface';
import { USER_ROLE } from '@modules/user-roles/entities/user-role.entity';

@Injectable()
export class ApprovedOneState implements IFlashCardState {
	getStateName(): FlashCardStateEnum {
		return FlashCardStateEnum.APPROVED_ONE;
	}

	canTransitionTo(
		targetState: FlashCardStateEnum,
		userRoles: string[],
	): boolean {
		if (targetState === FlashCardStateEnum.DRAFT) return true;
		if (targetState === FlashCardStateEnum.APPROVED_TWO) {
			return userRoles.includes(USER_ROLE.ADMIN);
		}
		return false;
	}

	async submit(): Promise<void> {
		throw new BadRequestException('Flash card is already approved');
	}

	async approve(
		context: IFlashCardStateContext,
		userId: string,
		comment?: string,
	): Promise<void> {
		const user = await context.getUser(userId);
		const userRole = user.role ? user.role.name : '';
		const userRoles = userRole ? [userRole] : [];

		if (!this.canTransitionTo(FlashCardStateEnum.APPROVED_TWO, userRoles)) {
			throw new ForbiddenException('Only admins can give second approval');
		}

		await context.transitionTo(
			FlashCardStateEnum.APPROVED_TWO,
			userId,
			comment,
		);
	}

	async reject(
		context: IFlashCardStateContext,
		userId: string,
		comment?: string,
	): Promise<void> {
		const user = await context.getUser(userId);
		if (
			![USER_ROLE.ADMIN, USER_ROLE.TEAM_LEADER].includes(
				user.role?.name as USER_ROLE,
			)
		) {
			throw new ForbiddenException('Only reviewers can reject a flash card');
		}
		await context.transitionTo(FlashCardStateEnum.DRAFT, userId, comment);
	}

	async publish(): Promise<void> {
		throw new BadRequestException(
			'Flash card needs second approval before publishing',
		);
	}

	getAllowedTransitions(userRoles: string[]): FlashCardStateEnum[] {
		const transitions = [FlashCardStateEnum.DRAFT];
		if (userRoles.includes(USER_ROLE.ADMIN)) {
			transitions.push(FlashCardStateEnum.APPROVED_TWO);
		}
		return transitions;
	}
}
