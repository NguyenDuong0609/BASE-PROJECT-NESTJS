import { Module } from '@nestjs/common';
import { FlashCardsService } from './flash-cards.service';
import { FlashCardsController } from './flash-cards.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlashCard } from './entities/flash-card.entity';
import { FlashCardsRepository } from '@repositories/flash-cards.repository';
import { MediaModule } from '@modules/media/media.module';
import { AppCacheModule } from '@modules/shared/base/cache/app-cache.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
	imports: [
		TypeOrmModule.forFeature([FlashCard]),
		MediaModule,
		AppCacheModule,
		PermissionsModule,
	],
	controllers: [FlashCardsController],
	providers: [
		FlashCardsService,
		{
			provide: 'FlashCardsRepositoryInterface',
			useClass: FlashCardsRepository,
		},
	],
})
export class FlashCardsModule {}
