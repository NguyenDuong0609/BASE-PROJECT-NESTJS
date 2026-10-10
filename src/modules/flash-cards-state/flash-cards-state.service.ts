import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	Optional,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FlashCardState } from './entities/flash-card-state.entity';
import { FlashCardTransition } from './entities/flash-card-transition.entity';
import { FlashCardContext } from './states/flash-card-context';
import { User } from '@modules/users/entities/user.entity';
import { CreateFlashCardStateDto } from './dto/create-flash-card-state.dto';
import { UpdateFlashCardStateDto } from './dto/update-flash-card-state.dto';
import { FlashCardStateEnum } from './entities/flash-card-state.entity';
import { ApiException } from '../../shared/api-errors';
import { USER_ROLE } from '@modules/user-roles/entities/user-role.entity';
import { createContextLogger } from '../../configs/logger.config';

@Injectable()
export class FlashCardsStateService {
	private readonly logger: PinoLogger;

	constructor(
		@InjectRepository(FlashCardState)
		private readonly flashCardRepository: Repository<FlashCardState>,
		@InjectRepository(FlashCardTransition)
		private readonly transitionRepository: Repository<FlashCardTransition>,
		private readonly flashCardContext: FlashCardContext,
		@Optional() logger?: PinoLogger,
	) {
		this.logger = createContextLogger(FlashCardsStateService.name, logger);
	}

	async create(
		createDto: CreateFlashCardStateDto,
		userId: string,
	): Promise<FlashCardState> {
		const flashCard = this.flashCardRepository.create({
			...createDto,
			createdBy: { id: userId } as User,
			state: FlashCardStateEnum.DRAFT,
		});

		await this.flashCardRepository.save(flashCard);
		this.logger.info(
			{ flashCardId: flashCard.id, userId },
			'Flash card created',
		);
		return flashCard;
	}

	async findAll(limit = 20, offset = 0, userId: string, isAdmin: boolean) {
		const [items, total] = await this.flashCardRepository.findAndCount({
			relations: ['createdBy'],
			where: isAdmin ? {} : { createdBy: { id: userId } },
			order: { createdAt: 'DESC' },
			skip: offset,
			take: limit,
		});

		return { items, total, limit, offset };
	}

	async findOne(
		id: string,
		userId: string,
		isAdmin: boolean,
	): Promise<FlashCardState> {
		const card = await this.flashCardRepository.findOne({
			where: { id },
			relations: ['createdBy', 'transitions', 'transitions.transitionedBy'],
		});
		if (!card) throw new ApiException('FLASH_CARD_NOT_FOUND');
		if (!isAdmin && card.createdBy.id !== userId) {
			throw new ApiException('FLASH_CARD_ACCESS_DENIED');
		}
		return card;
	}

	async update(
		id: string,
		updateDto: UpdateFlashCardStateDto,
		userId: string,
	): Promise<FlashCardState> {
		const flashCard = await this.findOne(id, userId, false);
		if (flashCard.createdBy.id !== userId) {
			throw new ForbiddenException('Only creator can update flash card');
		}

		if (flashCard.state !== FlashCardStateEnum.DRAFT) {
			throw new BadRequestException('Can only update draft flash cards');
		}

		Object.assign(flashCard, updateDto);
		return this.flashCardRepository.save(flashCard);
	}

	/**
	 * Submits a draft flash card for review
	 * Transitions the flash card state from DRAFT to IN_REVIEW
	 *
	 * @param {string} id - Flash card ID
	 * @param {string} userId - User submitting the flash card
	 * @param {string} [comment] - Optional comment for the submission
	 * @returns {Promise<FlashCardState>} Updated flash card with new state
	 * @throws {Error} When flash card not found or transition not allowed
	 *
	 * @example
	 * const flashCard = await service.submit(cardId, userId, 'Ready for review');
	 */
	async submit(
		id: string,
		userId: string,
		comment?: string,
	): Promise<FlashCardState> {
		await this.flashCardContext.loadFlashCard(id);
		if (this.flashCardContext.getFlashCard().createdBy.id !== userId) {
			throw new ForbiddenException(
				'Only the creator can submit this flash card',
			);
		}
		await this.flashCardContext.submit(userId, comment);
		this.logger.info({ flashCardId: id, userId }, 'Flash card submitted');
		return this.flashCardContext.getFlashCard();
	}

	/**
	 * Approves a flash card in review
	 * Transitions from IN_REVIEW to APPROVED_ONE, or APPROVED_ONE to APPROVED_TWO
	 * Requires team leader or admin role
	 *
	 * @param {string} id - Flash card ID
	 * @param {string} userId - User approving (must be team leader or admin)
	 * @param {string} [comment] - Optional approval comment
	 * @returns {Promise<FlashCardState>} Updated flash card with new state
	 * @throws {Error} When user lacks permission or transition not allowed
	 *
	 * @example
	 * const flashCard = await service.approve(cardId, adminId, 'Looks good!');
	 */
	async approve(
		id: string,
		userId: string,
		comment?: string,
	): Promise<FlashCardState> {
		await this.flashCardContext.loadFlashCard(id);
		await this.flashCardContext.approve(userId, comment);
		this.logger.info({ flashCardId: id, userId }, 'Flash card approved');
		return this.flashCardContext.getFlashCard();
	}

	/**
	 * Rejects a flash card and returns it to DRAFT state
	 * Can be called from any review or approved state
	 *
	 * @param {string} id - Flash card ID
	 * @param {string} userId - User rejecting the flash card
	 * @param {string} [comment] - Required rejection reason/comment
	 * @returns {Promise<FlashCardState>} Updated flash card back in DRAFT state
	 * @throws {Error} When transition not allowed
	 *
	 * @example
	 * const flashCard = await service.reject(cardId, userId, 'Needs corrections');
	 */
	async reject(
		id: string,
		userId: string,
		comment?: string,
	): Promise<FlashCardState> {
		await this.flashCardContext.loadFlashCard(id);
		await this.flashCardContext.reject(userId, comment);
		this.logger.info({ flashCardId: id, userId }, 'Flash card rejected');
		return this.flashCardContext.getFlashCard();
	}

	/**
	 * Publishes an approved flash card
	 * Transitions from APPROVED_TWO to PUBLISHED (final state)
	 * Requires admin role
	 *
	 * @param {string} id - Flash card ID
	 * @param {string} userId - Admin user publishing the card
	 * @param {string} [comment] - Optional publication comment
	 * @returns {Promise<FlashCardState>} Published flash card
	 * @throws {Error} When user is not admin or transition not allowed
	 *
	 * @example
	 * const flashCard = await service.publish(cardId, adminId);
	 */
	async publish(
		id: string,
		userId: string,
		comment?: string,
	): Promise<FlashCardState> {
		await this.flashCardContext.loadFlashCard(id);
		await this.flashCardContext.publish(userId, comment);
		this.logger.info({ flashCardId: id, userId }, 'Flash card published');
		return this.flashCardContext.getFlashCard();
	}

	async getTransitionHistory(
		id: string,
		userId: string,
		isAdmin: boolean,
	): Promise<FlashCardTransition[]> {
		await this.findOne(id, userId, isAdmin);
		return this.transitionRepository.find({
			where: { flashCard: { id } },
			relations: ['transitionedBy'],
			order: { transitionedAt: 'ASC' },
		});
	}

	async getAllowedTransitions(
		id: string,
		userId: string,
	): Promise<FlashCardStateEnum[]> {
		await this.flashCardContext.loadFlashCard(id);
		const card = this.flashCardContext.getFlashCard();
		const user = await this.flashCardContext.getUser(userId);
		if (card.createdBy.id !== userId && user.role?.name !== USER_ROLE.ADMIN) {
			throw new ApiException('FLASH_CARD_ACCESS_DENIED');
		}
		const userRole = user.role ? user.role.name : '';
		const userRoles = userRole ? [userRole] : [];
		return this.flashCardContext
			.getCurrentStateObject()
			.getAllowedTransitions(userRoles);
	}
}
