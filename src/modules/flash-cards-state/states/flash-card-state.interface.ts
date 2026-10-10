import { FlashCardStateEnum } from '../entities/flash-card-state.entity';
import { IFlashCardStateContext } from '../interfaces/state-context.interface';

export interface IFlashCardState {
	canTransitionTo(
		targetState: FlashCardStateEnum,
		userRoles: string[],
	): boolean;
	submit(
		context: IFlashCardStateContext,
		userId: string,
		comment?: string,
	): Promise<void>;
	approve(
		context: IFlashCardStateContext,
		userId: string,
		comment?: string,
	): Promise<void>;
	reject(
		context: IFlashCardStateContext,
		userId: string,
		comment?: string,
	): Promise<void>;
	publish(
		context: IFlashCardStateContext,
		userId: string,
		comment?: string,
	): Promise<void>;
	getStateName(): FlashCardStateEnum;
	getAllowedTransitions(userRoles: string[]): FlashCardStateEnum[];
}
