import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Optional } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Job } from 'bullmq';
import { EmailJobData } from '../interfaces/job-data.interface';
import { assertMockProcessorAllowed } from './mock-processor-policy';
import { createContextLogger } from '../../../configs/logger.config';

@Processor('email-queue')
export class EmailProcessor extends WorkerHost {
	private readonly logger: PinoLogger;

	constructor(@Optional() logger?: PinoLogger) {
		super();
		this.logger = createContextLogger(EmailProcessor.name, logger);
	}

	async process(job: Job<EmailJobData>): Promise<void> {
		assertMockProcessorAllowed('Email processor');
		this.logger.info({ jobId: job.id }, 'Processing email job');

		try {
			// TODO: Integrate with actual email service (e.g., SendGrid, AWS SES)
			await this.sendEmail();

			this.logger.info({ jobId: job.id }, 'Email job completed successfully');
		} catch (error) {
			this.logger.error({ err: error, jobId: job.id }, 'Email job failed');
			throw error; // Will trigger retry
		}
	}

	@OnWorkerEvent('completed')
	onCompleted(job: Job<EmailJobData>) {
		this.logger.info({ jobId: job.id }, 'Email job completed');
	}

	@OnWorkerEvent('failed')
	onFailed(job: Job<EmailJobData>, error: Error) {
		this.logger.error({ err: error, jobId: job.id }, 'Email job failed');
	}

	private async sendEmail(): Promise<void> {
		// Mock implementation
		return new Promise((resolve) => {
			setTimeout(() => {
				this.logger.debug('Mock email job completed');
				resolve();
			}, 1000);
		});
	}
}
