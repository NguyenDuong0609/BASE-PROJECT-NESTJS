import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { EmailProcessor } from './processors/email.processor';
import { ImageProcessor } from './processors/image.processor';
import { NotificationProcessor } from './processors/notification.processor';

@Module({
	imports: [
		BullModule.forRootAsync({
			imports: [ConfigModule],
			useFactory: async (configService: ConfigService) => ({
				connection: {
					host: configService.get('redis.host'),
					port: configService.get('redis.port'),
					password: configService.get('redis.password'),
					db: configService.get('redis.db'),
				},
			}),
			inject: [ConfigService],
		}),
		BullModule.registerQueue(
			{ name: 'email-queue' },
			{ name: 'image-queue' },
			{ name: 'notification-queue' },
		),
	],
	controllers: [QueueController],
	providers: [
		QueueService,
		EmailProcessor,
		ImageProcessor,
		NotificationProcessor,
	],
	exports: [QueueService, BullModule],
})
export class QueueModule {}
