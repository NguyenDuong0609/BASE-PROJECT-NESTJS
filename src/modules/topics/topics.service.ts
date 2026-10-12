import { Inject, Injectable, Optional } from '@nestjs/common';
import { BaseServiceAbstract } from 'src/services/base/base.abstract.service';
import { Topic } from './entities/topic.entity';
import { TopicsRepositoryInterface } from './interfaces/topics.interface';
import { AppCacheService } from '@modules/shared/base/cache/app-cache.service';
import { AppCacheKeyBuilder } from '@modules/shared/base/cache/app-cache-key.builder';
import { instanceToPlain } from 'class-transformer';
import { DeepPartial, FindManyOptions } from 'typeorm';

const TOPICS_CACHE_NAMESPACE = 'topics';
const TOPICS_CACHE_TTL_MS = 60_000;

@Injectable()
export class TopicsService extends BaseServiceAbstract<Topic> {
	constructor(
		@Inject('TopicsRepositoryInterface')
		private readonly topicsRepository: TopicsRepositoryInterface,
		@Optional() private readonly cache?: AppCacheService,
	) {
		super(topicsRepository);
	}

	override async create(createDto: DeepPartial<Topic>): Promise<Topic> {
		const created = await super.create(createDto);
		await this.cache?.invalidate(TOPICS_CACHE_NAMESPACE);
		return created;
	}

	override async findAll(options?: FindManyOptions<Topic>) {
		if (!this.cache) {
			return super.findAll(options);
		}
		return this.cache.getOrSet(
			TOPICS_CACHE_NAMESPACE,
			AppCacheKeyBuilder.build({
				route: '/topics',
				query: {
					skip: options?.skip ?? 0,
					take: options?.take ?? 20,
				},
			}),
			TOPICS_CACHE_TTL_MS,
			() => super.findAll(options),
			(val) => instanceToPlain(val),
		);
	}

	override async findOne(id: string): Promise<Topic> {
		if (!this.cache) {
			return super.findOne(id);
		}
		return this.cache.getOrSet(
			TOPICS_CACHE_NAMESPACE,
			AppCacheKeyBuilder.build({
				route: '/topics/:id',
				params: { id },
			}),
			TOPICS_CACHE_TTL_MS,
			() => super.findOne(id),
			(val) => instanceToPlain(val),
		);
	}

	override async update(
		id: string,
		updateDto: DeepPartial<Topic>,
	): Promise<Topic> {
		const updated = await super.update(id, updateDto);
		await this.cache?.invalidate(TOPICS_CACHE_NAMESPACE);
		return updated;
	}

	override async remove(id: string): Promise<boolean> {
		const removed = await super.remove(id);
		await this.cache?.invalidate(TOPICS_CACHE_NAMESPACE);
		return removed;
	}
}
