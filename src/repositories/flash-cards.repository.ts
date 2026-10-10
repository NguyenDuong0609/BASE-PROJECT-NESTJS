import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepositoryAbstract } from './base/base.abstract.repository';
import { FlashCard } from '@modules/flash-cards/entities/flash-card.entity';
import { FlashCardsRepositoryInterface } from '@modules/flash-cards/interfaces/flash-cards.interface';

@Injectable()
export class FlashCardsRepository
	extends BaseRepositoryAbstract<FlashCard>
	implements FlashCardsRepositoryInterface
{
	constructor(
		@InjectRepository(FlashCard)
		private readonly flashCardRepository: Repository<FlashCard>,
	) {
		super(flashCardRepository);
	}
}
