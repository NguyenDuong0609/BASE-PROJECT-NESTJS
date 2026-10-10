import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepositoryAbstract } from './base/base.abstract.repository';
import { Topic } from '@modules/topics/entities/topic.entity';
import { TopicsRepositoryInterface } from '@modules/topics/interfaces/topics.interface';

@Injectable()
export class TopicsRepository
	extends BaseRepositoryAbstract<Topic>
	implements TopicsRepositoryInterface
{
	constructor(
		@InjectRepository(Topic)
		private readonly topicRepository: Repository<Topic>,
	) {
		super(topicRepository);
	}
}
