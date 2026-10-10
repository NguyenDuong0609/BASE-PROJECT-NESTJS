import { FlashCardStateEnum } from '../entities/flash-card-state.entity';
import { User } from '@modules/users/entities/user.entity';

export interface IFlashCardStateContext {
	transitionTo(
		state: FlashCardStateEnum,
		userId: string,
		comment?: string,
	): Promise<void>;
	getCurrentState(): FlashCardStateEnum;
	getUser(userId: string): Promise<User>;
	flashCardId: string;
}
