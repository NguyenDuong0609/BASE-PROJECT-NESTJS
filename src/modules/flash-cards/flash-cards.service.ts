import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import { DeepPartial, FindOptionsWhere } from 'typeorm';
import { BaseServiceAbstract } from 'src/services/base/base.abstract.service';
import { FlashCard } from './entities/flash-card.entity';
import { FlashCardsRepositoryInterface } from './interfaces/flash-cards.interface';
import { User } from '@modules/users/entities/user.entity';
import { USER_ROLE } from '@modules/user-roles/entities/user-role.entity';
import { ApiException } from '../../shared/api-errors';
import { AppCacheService } from '@modules/shared/base/cache/app-cache.service';
import { AppCacheKeyBuilder } from '@modules/shared/base/cache/app-cache-key.builder';
import { UpdateFlashCardDto } from './dto/update-flash-card.dto';

const FLASH_CARDS_CACHE_NAMESPACE = 'flash-cards';
const FLASH_CARDS_CACHE_TTL_MS = 30_000;

@Injectable()
export class FlashCardsService extends BaseServiceAbstract<FlashCard> {
	constructor(
		@Inject('FlashCardsRepositoryInterface')
		private readonly flashCardsRepository: FlashCardsRepositoryInterface,
		private readonly cache: AppCacheService,
	) {
		super(flashCardsRepository);
	}

	override async create(createDto: DeepPartial<FlashCard>): Promise<FlashCard> {
		const created = await super.create(createDto);
		await this.cache.invalidate(FLASH_CARDS_CACHE_NAMESPACE);
		return created;
	}

	async findAllForUser(user: User) {
		const isAdmin = user.role?.name === USER_ROLE.ADMIN;
		const conditions: FindOptionsWhere<FlashCard>[] = [{ is_public: true }];
		if (!isAdmin) conditions.push({ user: { id: user.id } });

		return this.cache.getOrSet(
			FLASH_CARDS_CACHE_NAMESPACE,
			AppCacheKeyBuilder.build({
				route: '/flash-cards',
				scope: { userId: user.id, role: isAdmin ? 'admin' : 'user' },
				query: {},
			}),
			FLASH_CARDS_CACHE_TTL_MS,
			() =>
				this.flashCardsRepository.findAll({
					...(isAdmin ? {} : { where: conditions }),
					relations: ['user', 'topics'],
				}),
			(value) => instanceToPlain(value),
		);
	}

	async findOneForUser(id: string, user: User) {
		const isAdmin = user.role?.name === USER_ROLE.ADMIN;
		return this.cache.getOrSet(
			FLASH_CARDS_CACHE_NAMESPACE,
			AppCacheKeyBuilder.build({
				route: '/flash-cards/:id',
				params: { id },
				scope: { userId: user.id, role: isAdmin ? 'admin' : 'user' },
			}),
			FLASH_CARDS_CACHE_TTL_MS,
			async () => {
				const card = await this.flashCardsRepository.findOneById(id, {
					relations: ['user', 'topics'],
				});
				if (!card) {
					throw new ApiException('FLASH_CARD_NOT_FOUND');
				}
				if (!card.is_public && card.user.id !== user.id && !isAdmin) {
					throw new ApiException('FLASH_CARD_ACCESS_DENIED');
				}
				return card;
			},
			(value) => instanceToPlain(value),
		);
	}

	async updateForUser(id: string, data: UpdateFlashCardDto, user: User) {
		const card = await this.flashCardsRepository.findOneById(id, {
			relations: ['user'],
		});
		if (!card) throw new ApiException('FLASH_CARD_NOT_FOUND');
		if (card.user.id !== user.id && user.role?.name !== USER_ROLE.ADMIN) {
			throw new ForbiddenException('You can only update your own flash cards');
		}
		const updated = await this.flashCardsRepository.update(
			id,
			data as DeepPartial<FlashCard>,
		);
		await this.cache.invalidate(FLASH_CARDS_CACHE_NAMESPACE);
		return updated;
	}

	async removeForUser(id: string, user: User) {
		const card = await this.flashCardsRepository.findOneById(id, {
			relations: ['user'],
		});
		if (!card) throw new ApiException('FLASH_CARD_NOT_FOUND');
		if (card.user.id !== user.id && user.role?.name !== USER_ROLE.ADMIN) {
			throw new ForbiddenException('You can only delete your own flash cards');
		}
		const removed = await this.flashCardsRepository.softDelete(id);
		await this.cache.invalidate(FLASH_CARDS_CACHE_NAMESPACE);
		return removed;
	}
}
