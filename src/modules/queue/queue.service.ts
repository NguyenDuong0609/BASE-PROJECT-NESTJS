import {
	Injectable,
	NotFoundException,
	BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
	EmailJobData,
	ImageJobData,
	NotificationJobData,
} from './interfaces/job-data.interface';

@Injectable()
export class QueueService {
	constructor(
		@InjectQueue('email-queue') private emailQueue: Queue,
		@InjectQueue('image-queue') private imageQueue: Queue,
		@InjectQueue('notification-queue') private notificationQueue: Queue,
	) {}

	async addEmailJob(data: EmailJobData, priority = 5): Promise<string> {
		const job = await this.emailQueue.add('send-email', data, {
			priority,
			attempts: 3,
			backoff: {
				type: 'exponential',
				delay: 2000,
			},
			removeOnComplete: 100,
			removeOnFail: 200,
		});
		return job.id;
	}

	async addImageProcessingJob(data: ImageJobData): Promise<string> {
		const job = await this.imageQueue.add('process-image', data, {
			attempts: 2,
			backoff: {
				type: 'fixed',
				delay: 5000,
			},
			removeOnComplete: 100,
			removeOnFail: 200,
		});
		return job.id;
	}

	async addNotificationJob(data: NotificationJobData): Promise<string> {
		const job = await this.notificationQueue.add('send-notification', data, {
			attempts: 3,
			backoff: {
				type: 'exponential',
				delay: 1000,
			},
			removeOnComplete: 100,
			removeOnFail: 200,
		});
		return job.id;
	}

	async getJobStatus(queueName: string, jobId: string) {
		const queue = this.getQueue(queueName);
		const job = await queue.getJob(jobId);

		if (!job) {
			throw new NotFoundException(
				`Job ${jobId} not found in queue ${queueName}`,
			);
		}

		return {
			id: job.id,
			name: job.name,
			data: job.data,
			progress: await job.progress,
			attemptsMade: job.attemptsMade,
			state: await job.getState(),
			finishedOn: job.finishedOn,
			processedOn: job.processedOn,
			failedReason: job.failedReason,
		};
	}

	async getQueueStats(queueName: string) {
		const queue = this.getQueue(queueName);

		const [waiting, active, completed, failed, delayed] = await Promise.all([
			queue.getWaitingCount(),
			queue.getActiveCount(),
			queue.getCompletedCount(),
			queue.getFailedCount(),
			queue.getDelayedCount(),
		]);

		return {
			queueName,
			waiting,
			active,
			completed,
			failed,
			delayed,
			total: waiting + active + completed + failed + delayed,
		};
	}

	async getMetricsSnapshot(): Promise<Record<string, Record<string, number>>> {
		const queues = [
			['email', this.emailQueue],
			['image', this.imageQueue],
			['notification', this.notificationQueue],
		] as const;
		const snapshots = await Promise.all(
			queues.map(
				async ([name, queue]) =>
					[
						name,
						await queue.getJobCounts(
							'waiting',
							'active',
							'completed',
							'failed',
							'delayed',
						),
					] as const,
			),
		);
		return Object.fromEntries(snapshots);
	}

	async pingRedis(): Promise<void> {
		await this.emailQueue.getJobCounts();
	}

	private getQueue(queueName: string): Queue {
		switch (queueName) {
			case 'email-queue':
				return this.emailQueue;
			case 'image-queue':
				return this.imageQueue;
			case 'notification-queue':
				return this.notificationQueue;
			default:
				throw new BadRequestException(`Unknown queue: ${queueName}`);
		}
	}
}
