import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepositoryAbstract } from './base/base.abstract.repository';
import { Collection } from '@modules/collections/entities/collection.entity';
import { CollectionRepositoryInterface } from '@modules/collections/interfaces/collections.interface';

@Injectable()
export class CollectionRepository
	extends BaseRepositoryAbstract<Collection>
	implements CollectionRepositoryInterface
{
	constructor(
		@InjectRepository(Collection)
		private readonly collectionRepository: Repository<Collection>,
	) {
		super(collectionRepository);
	}
}
