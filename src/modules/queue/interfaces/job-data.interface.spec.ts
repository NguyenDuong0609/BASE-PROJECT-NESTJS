/**
 * Unit tests for Queue interfaces and enums
 * Validates that all interfaces and enums are properly defined
 */

import {
	EmailJobData,
	ImageJobData,
	NotificationJobData,
	ImageOperation,
	NotificationType,
	JobStatus,
	QueueJobOptions,
} from './job-data.interface';

describe('Queue Interfaces', () => {
	describe('EmailJobData', () => {
		it('should be defined with all required properties', () => {
			const emailJob: EmailJobData = {
				to: ['test@example.com'],
				subject: 'Test Email',
				template: 'welcome',
				context: { name: 'John' },
			};

			expect(emailJob.to).toEqual(['test@example.com']);
			expect(emailJob.subject).toBe('Test Email');
			expect(emailJob.template).toBe('welcome');
			expect(emailJob.context).toEqual({ name: 'John' });
		});

		it('should support optional attachments', () => {
			const emailJobWithAttachment: EmailJobData = {
				to: ['test@example.com'],
				subject: 'Test Email',
				template: 'welcome',
				context: {},
				attachments: [
					{
						filename: 'document.pdf',
						path: '/path/to/document.pdf',
					},
				],
			};

			expect(emailJobWithAttachment.attachments).toBeDefined();
			expect(emailJobWithAttachment.attachments![0].filename).toBe(
				'document.pdf',
			);
		});
	});

	describe('ImageJobData', () => {
		it('should be defined with all required properties', () => {
			const imageJob: ImageJobData = {
				fileKey: 'uploads/image.jpg',
				operations: [ImageOperation.RESIZE, ImageOperation.COMPRESS],
				outputFormats: ['webp', 'jpg'],
			};

			expect(imageJob.fileKey).toBe('uploads/image.jpg');
			expect(imageJob.operations).toContain(ImageOperation.RESIZE);
			expect(imageJob.outputFormats).toContain('webp');
		});
	});

	describe('NotificationJobData', () => {
		it('should be defined with all required properties', () => {
			const notificationJob: NotificationJobData = {
				userId: 'user-123',
				type: NotificationType.INFO,
				title: 'Welcome',
				body: 'Welcome to our platform!',
			};

			expect(notificationJob.userId).toBe('user-123');
			expect(notificationJob.type).toBe(NotificationType.INFO);
			expect(notificationJob.title).toBe('Welcome');
		});

		it('should support optional data field', () => {
			const notificationJob: NotificationJobData = {
				userId: 'user-123',
				type: NotificationType.SUCCESS,
				title: 'Success',
				body: 'Operation completed',
				data: { orderId: '12345' },
			};

			expect(notificationJob.data).toBeDefined();
			expect(notificationJob.data!.orderId).toBe('12345');
		});
	});

	describe('ImageOperation enum', () => {
		it('should have all required operations', () => {
			expect(ImageOperation.RESIZE).toBe('resize');
			expect(ImageOperation.COMPRESS).toBe('compress');
			expect(ImageOperation.THUMBNAIL).toBe('thumbnail');
			expect(ImageOperation.WATERMARK).toBe('watermark');
		});

		it('should be usable in arrays', () => {
			const operations: ImageOperation[] = [
				ImageOperation.RESIZE,
				ImageOperation.COMPRESS,
			];

			expect(operations).toHaveLength(2);
			expect(operations[0]).toBe(ImageOperation.RESIZE);
		});
	});

	describe('NotificationType enum', () => {
		it('should have all required notification types', () => {
			expect(NotificationType.INFO).toBe('info');
			expect(NotificationType.WARNING).toBe('warning');
			expect(NotificationType.SUCCESS).toBe('success');
			expect(NotificationType.ERROR).toBe('error');
		});
	});

	describe('JobStatus', () => {
		it('should be defined with all required properties', () => {
			const jobStatus: JobStatus = {
				id: 'job-123',
				state: 'completed',
				progress: 100,
				returnvalue: { success: true },
			};

			expect(jobStatus.id).toBe('job-123');
			expect(jobStatus.state).toBe('completed');
			expect(jobStatus.progress).toBe(100);
			expect(jobStatus.returnvalue).toEqual({ success: true });
		});

		it('should support optional failedReason', () => {
			const failedJobStatus: JobStatus = {
				id: 'job-456',
				state: 'failed',
				progress: 50,
				returnvalue: null,
				failedReason: 'Connection timeout',
			};

			expect(failedJobStatus.failedReason).toBe('Connection timeout');
		});
	});

	describe('QueueJobOptions', () => {
		it('should be defined with all optional properties', () => {
			const options: QueueJobOptions = {
				attempts: 3,
				backoff: {
					type: 'exponential',
					delay: 2000,
				},
				priority: 5,
				timeout: 60000,
				removeOnComplete: true,
				removeOnFail: false,
			};

			expect(options.attempts).toBe(3);
			expect(options.backoff!.type).toBe('exponential');
			expect(options.priority).toBe(5);
		});

		it('should allow partial configuration', () => {
			const minimalOptions: QueueJobOptions = {
				attempts: 2,
			};

			expect(minimalOptions.attempts).toBe(2);
			expect(minimalOptions.priority).toBeUndefined();
		});

		it('should support fixed backoff type', () => {
			const options: QueueJobOptions = {
				backoff: {
					type: 'fixed',
					delay: 5000,
				},
			};

			expect(options.backoff!.type).toBe('fixed');
			expect(options.backoff!.delay).toBe(5000);
		});

		it('should support numeric removeOnComplete', () => {
			const options: QueueJobOptions = {
				removeOnComplete: 100,
				removeOnFail: 200,
			};

			expect(options.removeOnComplete).toBe(100);
			expect(options.removeOnFail).toBe(200);
		});
	});

	describe('Type Safety', () => {
		it('should enforce type constraints on EmailJobData', () => {
			// This test validates TypeScript type checking at compile time
			const validEmail: EmailJobData = {
				to: ['user@example.com'],
				subject: 'Test',
				template: 'test-template',
				context: { key: 'value' },
			};

			expect(validEmail).toBeDefined();
		});

		it('should enforce type constraints on ImageOperation enum', () => {
			const operation: ImageOperation = ImageOperation.RESIZE;

			expect(operation).toBe('resize');
		});

		it('should enforce type constraints on NotificationType enum', () => {
			const type: NotificationType = NotificationType.INFO;

			expect(type).toBe('info');
		});
	});
});
