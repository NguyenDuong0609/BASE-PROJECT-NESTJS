import {
	ForbiddenException,
	Inject,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { BaseServiceAbstract } from 'src/services/base/base.abstract.service';
import { Collection } from './entities/collection.entity';
import { CollectionRepositoryInterface } from './interfaces/collections.interface';
import { User } from '@modules/users/entities/user.entity';
import { USER_ROLE } from '@modules/user-roles/entities/user-role.entity';
import { FindOptionsWhere, In } from 'typeorm';
import { COLLECTION_LEVEL } from './entities/collection.entity';
import { UpdateCollectionDto } from './dto/update-collection.dto';

@Injectable()
export class CollectionsService extends BaseServiceAbstract<Collection> {
	/**
	 *
	 */
	constructor(
		@Inject('CollectionRepositoryInterface')
		private readonly collectionRepository: CollectionRepositoryInterface,
	) {
		super(collectionRepository);
	}

	async findAllForUser(
		user: User,
		skip = 0,
		take = 20,
		levels?: COLLECTION_LEVEL[],
	) {
		const levelFilter = levels?.length ? { level: In(levels) } : {};
		if (user.role?.name === USER_ROLE.ADMIN) {
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
	}

	async findOneForUser(id: string, user: User) {
		const collection = await this.collectionRepository.findOneById(id, {
			relations: ['user'],
		});
		if (!collection) throw new NotFoundException('Collection not found');
		if (
			!collection.is_public &&
			collection.user.id !== user.id &&
			user.role?.name !== USER_ROLE.ADMIN
		) {
			throw new ForbiddenException('You cannot access this collection');
		}
		return collection;
	}

	async updateForUser(id: string, data: UpdateCollectionDto, user: User) {
		const collection = await this.collectionRepository.findOneById(id, {
			relations: ['user'],
		});
		if (!collection) throw new NotFoundException('Collection not found');
		if (collection.user.id !== user.id && user.role?.name !== USER_ROLE.ADMIN) {
			throw new ForbiddenException('You can only update your own collections');
		}
		return this.collectionRepository.update(id, data);
	}

	async removeForUser(id: string, user: User) {
		const collection = await this.collectionRepository.findOneById(id, {
			relations: ['user'],
		});
		if (!collection) throw new NotFoundException('Collection not found');
		if (collection.user.id !== user.id && user.role?.name !== USER_ROLE.ADMIN) {
			throw new ForbiddenException('You can only delete your own collections');
		}
		return this.collectionRepository.softDelete(id);
	}
}
