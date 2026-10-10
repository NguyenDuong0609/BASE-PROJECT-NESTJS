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
export class ApprovedTwoState implements IFlashCardState {
	getStateName(): FlashCardStateEnum {
		return FlashCardStateEnum.APPROVED_TWO;
	}

	canTransitionTo(
		targetState: FlashCardStateEnum,
		userRoles: string[],
	): boolean {
		if (targetState === FlashCardStateEnum.DRAFT) return true;
		if (targetState === FlashCardStateEnum.PUBLISHED) {
			return userRoles.includes(USER_ROLE.ADMIN);
		}
		return false;
	}

	async submit(): Promise<void> {
		throw new BadRequestException('Flash card is already fully approved');
	}

	async approve(): Promise<void> {
		throw new BadRequestException('Flash card already has two approvals');
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

	async publish(
		context: IFlashCardStateContext,
		userId: string,
		comment?: string,
	): Promise<void> {
		const user = await context.getUser(userId);
		const userRole = user.role ? user.role.name : '';
		const userRoles = userRole ? [userRole] : [];

		if (!this.canTransitionTo(FlashCardStateEnum.PUBLISHED, userRoles)) {
			throw new ForbiddenException('Only admins can publish');
		}

		await context.transitionTo(FlashCardStateEnum.PUBLISHED, userId, comment);
	}

	getAllowedTransitions(userRoles: string[]): FlashCardStateEnum[] {
		const transitions = [FlashCardStateEnum.DRAFT];
		if (userRoles.includes(USER_ROLE.ADMIN)) {
			transitions.push(FlashCardStateEnum.PUBLISHED);
		}
		return transitions;
	}
}
