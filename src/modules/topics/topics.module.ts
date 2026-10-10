import { Module } from '@nestjs/common';
import { TopicsService } from './topics.service';
import { TopicsController } from './topics.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Topic } from './entities/topic.entity';
import { TopicsRepository } from '@repositories/topics.repository';

@Module({
	imports: [TypeOrmModule.forFeature([Topic])],
	controllers: [TopicsController],
	providers: [
		TopicsService,
		{
			provide: 'TopicsRepositoryInterface',
			useClass: TopicsRepository,
		},
	],
	exports: [TopicsService],
})
export class TopicsModule {}
