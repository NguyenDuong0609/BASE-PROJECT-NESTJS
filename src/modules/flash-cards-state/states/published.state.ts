import { Injectable, BadRequestException } from '@nestjs/common';
import { IFlashCardState } from './flash-card-state.interface';
import { FlashCardStateEnum } from '../entities/flash-card-state.entity';

@Injectable()
export class PublishedState implements IFlashCardState {
	getStateName(): FlashCardStateEnum {
		return FlashCardStateEnum.PUBLISHED;
	}

	canTransitionTo(
		targetState: FlashCardStateEnum,
		userRoles: string[],
	): boolean {
		void targetState;
		void userRoles;
		return false;
	}

	async submit(): Promise<void> {
		throw new BadRequestException('Cannot modify a published flash card');
	}

	async approve(): Promise<void> {
		throw new BadRequestException('Flash card is already published');
	}

	async reject(): Promise<void> {
		throw new BadRequestException('Cannot reject a published flash card');
	}

	async publish(): Promise<void> {
		throw new BadRequestException('Flash card is already published');
	}

	getAllowedTransitions(userRoles: string[]): FlashCardStateEnum[] {
		void userRoles;
		return [];
	}
}
