import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlashCardState } from './entities/flash-card-state.entity';
import { FlashCardTransition } from './entities/flash-card-transition.entity';
import { User } from '@modules/users/entities/user.entity';
import { FlashCardsStateService } from './flash-cards-state.service';
import { FlashCardsStateController } from './flash-cards-state.controller';
import { FlashCardContext } from './states/flash-card-context';
import { DraftState } from './states/draft.state';
import { InReviewState } from './states/in-review.state';
import { ApprovedOneState } from './states/approved-one.state';
import { ApprovedTwoState } from './states/approved-two.state';
import { PublishedState } from './states/published.state';

@Module({
	imports: [
		TypeOrmModule.forFeature([FlashCardState, FlashCardTransition, User]),
	],
	controllers: [FlashCardsStateController],
	providers: [
		FlashCardsStateService,
		FlashCardContext,
		DraftState,
		InReviewState,
		ApprovedOneState,
		ApprovedTwoState,
		PublishedState,
	],
	exports: [FlashCardsStateService],
})
export class FlashCardsStateModule {}
