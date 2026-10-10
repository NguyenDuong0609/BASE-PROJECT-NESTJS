import { Module } from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { CollectionsController } from './collections.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Collection } from './entities/collection.entity';
import { CollectionRepository } from '@repositories/collection.repository';
import { MediaModule } from '@modules/media/media.module';

@Module({
	imports: [TypeOrmModule.forFeature([Collection]), MediaModule],
	controllers: [CollectionsController],
	providers: [
		CollectionsService,
		{
			provide: 'CollectionRepositoryInterface',
			useClass: CollectionRepository,
		},
	],
})
export class CollectionsModule {}
