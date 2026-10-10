import { QueueService } from './queue.service';
import type { Queue } from 'bullmq';
import { NotificationType } from './interfaces/job-data.interface';

jest.mock('@nestjs/bullmq', () => ({
	InjectQueue: () => () => undefined,
}));

describe('QueueService', () => {
	let service: QueueService;
	let emailQueue: jest.Mocked<Queue>;
	let imageQueue: jest.Mocked<Queue>;
	let notificationQueue: jest.Mocked<Queue>;

	beforeEach(() => {
		const queueMock = () =>
			({
				add: jest.fn(),
				getJob: jest.fn(),
				getWaitingCount: jest.fn(),
				getActiveCount: jest.fn(),
				getCompletedCount: jest.fn(),
				getFailedCount: jest.fn(),
				getDelayedCount: jest.fn(),
				getJobCounts: jest.fn(),
			}) as unknown as jest.Mocked<Queue>;
		emailQueue = queueMock();
		imageQueue = queueMock();
		notificationQueue = queueMock();
		service = new QueueService(emailQueue, imageQueue, notificationQueue);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	it('returns bounded queue counts for application metrics', async () => {
		emailQueue.getJobCounts.mockResolvedValue({
			waiting: 1,
			active: 2,
			completed: 3,
			failed: 4,
			delayed: 5,
		} as never);
		imageQueue.getJobCounts.mockResolvedValue({
			waiting: 0,
			active: 0,
			completed: 0,
			failed: 0,
			delayed: 0,
		} as never);
		notificationQueue.getJobCounts.mockResolvedValue({
			waiting: 0,
			active: 0,
			completed: 0,
			failed: 0,
			delayed: 0,
		} as never);

		const result = await service.getMetricsSnapshot();

		expect(result.email).toMatchObject({
			waiting: 1,
			active: 2,
			failed: 4,
		});
		expect(emailQueue.getJobCounts).toHaveBeenCalledWith(
			'waiting',
			'active',
			'completed',
			'failed',
			'delayed',
		);
	});

	describe('addEmailJob', () => {
		it('should add email job to queue', async () => {
			const emailData = {
				to: ['test@example.com'],
				subject: 'Test Email',
				template: 'welcome',
				context: {},
			};

			emailQueue.add = jest.fn().mockResolvedValue({ id: 'job-1' });

			const result = await service.addEmailJob(emailData);

			expect(result).toBe('job-1');
			expect(emailQueue.add).toHaveBeenCalledWith(
				'send-email',
				emailData,
				expect.objectContaining({
					attempts: 3,
					backoff: { type: 'exponential', delay: 2000 },
					removeOnComplete: 100,
					removeOnFail: 200,
				}),
			);
		});
	});

	describe('addImageProcessingJob', () => {
		it('should add image processing job to queue', async () => {
			const imageData = {
				fileKey: 'uploads/test.jpg',
				operations: ['resize', 'compress'] as never,
				outputFormats: ['webp'],
			};

			imageQueue.add = jest.fn().mockResolvedValue({ id: 'job-2' });

			const result = await service.addImageProcessingJob(imageData);

			expect(result).toBe('job-2');
			expect(imageQueue.add).toHaveBeenCalledWith(
				'process-image',
				imageData,
				expect.objectContaining({
					attempts: 2,
					backoff: { type: 'fixed', delay: 5000 },
					removeOnComplete: 100,
					removeOnFail: 200,
				}),
			);
		});
	});

	describe('addNotificationJob', () => {
		it('should add notification job to queue with priority', async () => {
			const notificationData = {
				userId: 'user-1',
				type: NotificationType.SUCCESS,
				title: 'Reward',
				body: 'You earned 10 points!',
				data: {},
			};

			notificationQueue.add = jest.fn().mockResolvedValue({ id: 'job-3' });

			const result = await service.addNotificationJob(notificationData);

			expect(result).toBe('job-3');
			expect(notificationQueue.add).toHaveBeenCalledWith(
				'send-notification',
				notificationData,
				expect.objectContaining({
					attempts: 3,
					backoff: { type: 'exponential', delay: 1000 },
					removeOnComplete: 100,
					removeOnFail: 200,
				}),
			);
		});
	});

	describe('getJobStatus', () => {
		it('should return job status from queue', async () => {
			const mockJob = {
				id: 'job-1',
				name: 'send-email',
				data: {},
				progress: 100,
				returnvalue: null,
				attemptsMade: 0,
				finishedOn: undefined,
				processedOn: undefined,
				failedReason: undefined,
				getState: jest.fn().mockResolvedValue('completed'),
			};

			emailQueue.getJob = jest.fn().mockResolvedValue(mockJob);

			const result = await service.getJobStatus('email-queue', 'job-1');

			expect(result).toBeDefined();
			expect(result.id).toBe('job-1');
		});

		it('should reject when the requested job does not exist', async () => {
			emailQueue.getJob = jest.fn().mockResolvedValue(null);

			await expect(
				service.getJobStatus('email-queue', 'non-existent'),
			).rejects.toThrow('not found');
		});
	});
});
