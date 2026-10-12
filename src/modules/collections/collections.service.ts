import {
	ForbiddenException,
	Inject,
	Injectable,
	NotFoundException,
	Optional,
} from '@nestjs/common';
import { BaseServiceAbstract } from 'src/services/base/base.abstract.service';
import { Collection } from './entities/collection.entity';
import { CollectionRepositoryInterface } from './interfaces/collections.interface';
import { User } from '@modules/users/entities/user.entity';
import { USER_ROLE } from '@modules/user-roles/entities/user-role.entity';
import { DeepPartial, FindOptionsWhere, In } from 'typeorm';
import { COLLECTION_LEVEL } from './entities/collection.entity';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { AppCacheService } from '@modules/shared/base/cache/app-cache.service';
import { AppCacheKeyBuilder } from '@modules/shared/base/cache/app-cache-key.builder';
import { instanceToPlain } from 'class-transformer';

const COLLECTIONS_CACHE_NAMESPACE = 'collections';
const COLLECTIONS_CACHE_TTL_MS = 30_000;

@Injectable()
export class CollectionsService extends BaseServiceAbstract<Collection> {
	constructor(
		@Inject('CollectionRepositoryInterface')
		private readonly collectionRepository: CollectionRepositoryInterface,
		@Optional() private readonly cache?: AppCacheService,
	) {
		super(collectionRepository);
	}

	override async create(createDto: DeepPartial<Collection>): Promise<Collection> {
		const created = await super.create(createDto);
		await this.cache?.invalidate(COLLECTIONS_CACHE_NAMESPACE);
		return created;
	}

	async findAllForUser(
		user: User,
		skip = 0,
		take = 20,
		levels?: COLLECTION_LEVEL[],
	) {
		const isAdmin = user.role?.name === USER_ROLE.ADMIN;
		const queryCollections = () => {
			const levelFilter = levels?.length ? { level: In(levels) } : {};
			if (isAdmin) {
				return this.collectionRepository.findAll({
					...(levels?.length ? { where: levelFilter } : {}),
					relations: ['user'],
					skip,
					take,
				});
			}
			const where: FindOptionsWhere<Collection>[] = [
				{ is_public: true, ...levelFilter },
				{ user: { id: user.id }, ...levelFilter },
			];
			return this.collectionRepository.findAll({
				where,
				relations: ['user'],
				skip,
				take,
			});
		};

		if (!this.cache) {
			return queryCollections();
		}

		return this.cache.getOrSet(
			COLLECTIONS_CACHE_NAMESPACE,
			AppCacheKeyBuilder.build({
				route: '/collections',
				scope: { userId: user.id, role: isAdmin ? 'admin' : 'user' },
				query: { skip, take, levels: levels ?? [] },
			}),
			COLLECTIONS_CACHE_TTL_MS,
			queryCollections,
			(val) => instanceToPlain(val),
		);
	}

	async findOneForUser(id: string, user: User) {
		const isAdmin = user.role?.name === USER_ROLE.ADMIN;
		const queryCollection = async () => {
			const collection = await this.collectionRepository.findOneById(id, {
				relations: ['user'],
			});
			if (!collection) throw new NotFoundException('Collection not found');
			if (
				!collection.is_public &&
				collection.user.id !== user.id &&
				!isAdmin
			) {
				throw new ForbiddenException('You cannot access this collection');
			}
			return collection;
		};

		if (!this.cache) {
			return queryCollection();
		}

		return this.cache.getOrSet(
			COLLECTIONS_CACHE_NAMESPACE,
			AppCacheKeyBuilder.build({
				route: '/collections/:id',
				params: { id },
				scope: { userId: user.id, role: isAdmin ? 'admin' : 'user' },
			}),
			COLLECTIONS_CACHE_TTL_MS,
			queryCollection,
			(val) => instanceToPlain(val),
		);
	}

	async updateForUser(id: string, data: UpdateCollectionDto, user: User) {
		const collection = await this.collectionRepository.findOneById(id, {
			relations: ['user'],
		});
		if (!collection) throw new NotFoundException('Collection not found');
		if (collection.user.id !== user.id && user.role?.name !== USER_ROLE.ADMIN) {
			throw new ForbiddenException('You can only update your own collections');
		}
		const updated = await this.collectionRepository.update(id, data);
		await this.cache?.invalidate(COLLECTIONS_CACHE_NAMESPACE);
		return updated;
	}

	async removeForUser(id: string, user: User) {
		const collection = await this.collectionRepository.findOneById(id, {
			relations: ['user'],
		});
		if (!collection) throw new NotFoundException('Collection not found');
		if (collection.user.id !== user.id && user.role?.name !== USER_ROLE.ADMIN) {
			throw new ForbiddenException('You can only delete your own collections');
		}
		const removed = await this.collectionRepository.softDelete(id);
		await this.cache?.invalidate(COLLECTIONS_CACHE_NAMESPACE);
		return removed;
	}
}
