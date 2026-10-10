import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FlashCardState as FlashCardEntity } from '../entities/flash-card-state.entity';
import { FlashCardTransition } from '../entities/flash-card-transition.entity';
import { FlashCardStateEnum } from '../entities/flash-card-state.entity';
import { ApiException } from '../../../shared/api-errors';
import { IFlashCardState } from './flash-card-state.interface';
import { IFlashCardStateContext } from '../interfaces/state-context.interface';
import { DraftState } from './draft.state';
import { InReviewState } from './in-review.state';
import { ApprovedOneState } from './approved-one.state';
import { ApprovedTwoState } from './approved-two.state';
import { PublishedState } from './published.state';
import { User } from '@modules/users/entities/user.entity';

@Injectable()
export class FlashCardContext implements IFlashCardStateContext {
	private stateMap: Map<FlashCardStateEnum, IFlashCardState>;

	constructor(
		@InjectRepository(FlashCardEntity)
		private readonly flashCardRepository: Repository<FlashCardEntity>,
		@InjectRepository(FlashCardTransition)
		private readonly transitionRepository: Repository<FlashCardTransition>,
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
		private readonly draftState: DraftState,
		private readonly inReviewState: InReviewState,
		private readonly approvedOneState: ApprovedOneState,
		private readonly approvedTwoState: ApprovedTwoState,
		private readonly publishedState: PublishedState,
	) {
		this.stateMap = new Map<FlashCardStateEnum, IFlashCardState>();
		this.stateMap.set(FlashCardStateEnum.DRAFT, this.draftState);
		this.stateMap.set(FlashCardStateEnum.IN_REVIEW, this.inReviewState);
		this.stateMap.set(FlashCardStateEnum.APPROVED_ONE, this.approvedOneState);
		this.stateMap.set(FlashCardStateEnum.APPROVED_TWO, this.approvedTwoState);
		this.stateMap.set(FlashCardStateEnum.PUBLISHED, this.publishedState);
	}

	private flashCard: FlashCardEntity;
	private currentState: IFlashCardState;

	async loadFlashCard(flashCardId: string): Promise<void> {
		this.flashCard = await this.flashCardRepository.findOne({
			where: { id: flashCardId },
			relations: ['createdBy'],
		});

		if (!this.flashCard) {
			throw new ApiException('FLASH_CARD_NOT_FOUND');
		}

		this.currentState = this.stateMap.get(this.flashCard.state);
	}

	async transitionTo(
		targetState: FlashCardStateEnum,
		userId: string,
		comment?: string,
	): Promise<void> {
		const user = await this.getUser(userId);
		const userRole = user.role ? user.role.name : '';
		const userRoles = userRole ? [userRole] : [];

		if (!this.currentState.canTransitionTo(targetState, userRoles)) {
			throw new BadRequestException(
				`Cannot transition from ${this.flashCard.state} to ${targetState}`,
			);
		}

		const oldState = this.flashCard.state;

		await this.flashCardRepository.manager.transaction(async (manager) => {
			const flashCardRepo = manager.getRepository(FlashCardEntity);
			const transitionRepo = manager.getRepository(FlashCardTransition);
			const currentCard = await flashCardRepo.findOne({
				where: { id: this.flashCard.id },
				lock: { mode: 'pessimistic_write' },
			});
			if (!currentCard) {
				throw new ApiException('FLASH_CARD_NOT_FOUND');
			}
			if (currentCard.state !== oldState) {
				throw new ConflictException(
					'Flash card state changed; reload and retry',
				);
			}

			currentCard.state = targetState;
			await flashCardRepo.save(currentCard);

			const transition = transitionRepo.create({
				flashCard: currentCard,
				fromState: oldState,
				toState: targetState,
				transitionedBy: user,
				comment,
			});

			await transitionRepo.save(transition);
			this.flashCard = currentCard;
		});

		this.currentState = this.stateMap.get(targetState);
	}

	async getUser(userId: string): Promise<User> {
		const user = await this.userRepository.findOne({
			where: { id: userId },
			relations: ['role'],
		});

		if (!user) {
			throw new NotFoundException('User not found');
		}

		return user;
	}

	getCurrentState(): FlashCardStateEnum {
		return this.flashCard.state;
	}

	getCurrentStateObject(): IFlashCardState {
		return this.currentState;
	}

	get flashCardId(): string {
		return this.flashCard?.id;
	}

	getFlashCard(): FlashCardEntity {
		return this.flashCard;
	}

	async submit(userId: string, comment?: string): Promise<void> {
		await this.currentState.submit(this, userId, comment);
	}

	async approve(userId: string, comment?: string): Promise<void> {
		await this.currentState.approve(this, userId, comment);
	}

	async reject(userId: string, comment?: string): Promise<void> {
		await this.currentState.reject(this, userId, comment);
	}

	async publish(userId: string, comment?: string): Promise<void> {
		await this.currentState.publish(this, userId, comment);
	}
}
