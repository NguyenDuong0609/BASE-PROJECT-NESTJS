import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Optional } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Job } from 'bullmq';
import { NotificationJobData } from '../interfaces/job-data.interface';
import { assertMockProcessorAllowed } from './mock-processor-policy';
import { createContextLogger } from '../../../configs/logger.config';

@Processor('notification-queue')
export class NotificationProcessor extends WorkerHost {
	private readonly logger: PinoLogger;

	constructor(@Optional() logger?: PinoLogger) {
		super();
		this.logger = createContextLogger(NotificationProcessor.name, logger);
	}

	async process(job: Job<NotificationJobData>): Promise<void> {
		assertMockProcessorAllowed('Notification processor');
		this.logger.info({ jobId: job.id }, 'Processing notification job');

		try {
			// TODO: Integrate with actual notification service (e.g., Firebase, OneSignal)
			await this.sendNotification();

			this.logger.info(
				{ jobId: job.id },
				'Notification job completed successfully',
			);
		} catch (error) {
			this.logger.error(
				{ err: error, jobId: job.id },
				'Notification job failed',
			);
			throw error;
		}
	}

	@OnWorkerEvent('completed')
	onCompleted(job: Job<NotificationJobData>) {
		this.logger.info({ jobId: job.id }, 'Notification job completed');
	}

	@OnWorkerEvent('failed')
	onFailed(job: Job<NotificationJobData>, error: Error) {
		this.logger.error({ err: error, jobId: job.id }, 'Notification job failed');
	}

	private async sendNotification(): Promise<void> {
		// Mock implementation
		return new Promise((resolve) => {
			setTimeout(() => {
				this.logger.debug('Mock notification job completed');
				resolve();
			}, 500);
		});
	}
}
