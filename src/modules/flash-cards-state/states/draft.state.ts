import { Injectable, BadRequestException } from '@nestjs/common';
import { IFlashCardState } from './flash-card-state.interface';
import { FlashCardStateEnum } from '../entities/flash-card-state.entity';
import { IFlashCardStateContext } from '../interfaces/state-context.interface';

@Injectable()
export class DraftState implements IFlashCardState {
	getStateName(): FlashCardStateEnum {
		return FlashCardStateEnum.DRAFT;
	}

	canTransitionTo(
		targetState: FlashCardStateEnum,
		userRoles: string[],
	): boolean {
		void userRoles;
		return targetState === FlashCardStateEnum.IN_REVIEW;
	}

	/**
	 * Submits a draft flash card for review
	 *
	 * @param {IFlashCardStateContext} context - The flash card state context
	 * @param {string} userId - The ID of the user submitting the card
	 * @param {string} [comment] - Optional comment about the submission
	 * @returns {Promise<void>}
	 *
	 * @example
	 * await draftState.submit(context, userId, 'Ready for review');
	 */
	async submit(
		context: IFlashCardStateContext,
		userId: string,
		comment?: string,
	): Promise<void> {
		await context.transitionTo(FlashCardStateEnum.IN_REVIEW, userId, comment);
	}

	async approve(): Promise<void> {
		throw new BadRequestException('Cannot approve a draft flash card');
	}

	async reject(): Promise<void> {
		throw new BadRequestException('Cannot reject a draft flash card');
	}

	async publish(): Promise<void> {
		throw new BadRequestException('Cannot publish a draft flash card directly');
	}

	getAllowedTransitions(userRoles: string[]): FlashCardStateEnum[] {
		void userRoles;
		return [FlashCardStateEnum.IN_REVIEW];
	}
}
