import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Optional } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Job } from 'bullmq';
import { ImageJobData } from '../interfaces/job-data.interface';
import { assertMockProcessorAllowed } from './mock-processor-policy';
import { createContextLogger } from '../../../configs/logger.config';

@Processor('image-queue')
export class ImageProcessor extends WorkerHost {
	private readonly logger: PinoLogger;

	constructor(@Optional() logger?: PinoLogger) {
		super();
		this.logger = createContextLogger(ImageProcessor.name, logger);
	}

	async process(job: Job<ImageJobData>): Promise<void> {
		assertMockProcessorAllowed('Image processor');
		this.logger.info({ jobId: job.id }, 'Processing image job');

		try {
			// TODO: Integrate with actual image processing library (e.g., Sharp)
			const { operations } = job.data;
			const totalOps = operations.length;

			for (let i = 0; i < totalOps; i++) {
				const operation = operations[i];
				this.logger.debug(
					{ jobId: job.id, operation },
					'Applying image operation',
				);

				// TODO: Integrate with actual image processing library (e.g., Sharp)
				await this.processImage(operation.toString());

				// Update progress
				const progress = ((i + 1) / totalOps) * 100;
				await job.updateProgress(progress);
			}

			this.logger.info({ jobId: job.id }, 'Image job completed successfully');
		} catch (error) {
			this.logger.error({ err: error, jobId: job.id }, 'Image job failed');
			throw error;
		}
	}

	@OnWorkerEvent('completed')
	onCompleted(job: Job<ImageJobData>) {
		this.logger.info({ jobId: job.id }, 'Image job completed');
	}

	@OnWorkerEvent('failed')
	onFailed(job: Job<ImageJobData>, error: Error) {
		this.logger.error({ err: error, jobId: job.id }, 'Image job failed');
	}

	@OnWorkerEvent('progress')
	onProgress(job: Job<ImageJobData>, progress: number) {
		this.logger.debug({ jobId: job.id, progress }, 'Image job progress');
	}

	private async processImage(operation: string): Promise<void> {
		// Mock implementation
		return new Promise((resolve) => {
			setTimeout(() => {
				this.logger.debug({ operation }, 'Mock image operation completed');
				resolve();
			}, 2000);
		});
	}
}
