import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { MediaFile } from './entities/media-file.entity';
import { MediaService } from './services/media.service';
import { S3Service } from './services/s3.service';
import { MediaController } from './media.controller';
import { QueueModule } from '@modules/queue/queue.module';

@Module({
	imports: [TypeOrmModule.forFeature([MediaFile]), ConfigModule, QueueModule],
	controllers: [MediaController],
	providers: [MediaService, S3Service],
	exports: [MediaService, S3Service],
})
export class MediaModule {}
