import { Module } from '@nestjs/common';
import { config as loadEnv } from 'dotenv';
import { FlashCardsModule } from '@modules/flash-cards/flash-cards.module';
import { CollectionsModule } from '@modules/collections/collections.module';
import { TopicsModule } from '@modules/topics/topics.module';
import { CommentsModule } from '@modules/comments/comments.module';
import { CheckinModule } from '@modules/checkin/checkin.module';
import { FlashCardsStateModule } from '@modules/flash-cards-state/flash-cards-state.module';

loadEnv({
	path: process.env.NODE_ENV === 'development' ? '.env.dev' : '.env',
});

const enabledModules = [];

if (process.env.ENABLE_FLASH_CARDS === 'true') {
	enabledModules.push(FlashCardsModule, TopicsModule);
} else if (process.env.ENABLE_TOPICS === 'true') {
	enabledModules.push(TopicsModule);
}
if (process.env.ENABLE_COLLECTIONS === 'true') {
	enabledModules.push(CollectionsModule);
}
if (process.env.ENABLE_COMMENTS === 'true') enabledModules.push(CommentsModule);
if (process.env.ENABLE_CHECKIN === 'true') enabledModules.push(CheckinModule);
if (process.env.ENABLE_FLASH_CARD_STATES === 'true') {
	enabledModules.push(FlashCardsStateModule);
}

@Module({ imports: enabledModules })
export class DomainModulesModule {}
