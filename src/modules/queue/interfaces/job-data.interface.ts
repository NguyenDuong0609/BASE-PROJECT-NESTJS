/**
 * Job data interface for email queue
 * Used by the email processor to send emails
 */
export interface EmailJobData {
	to: string[];
	subject: string;
	template: string;
	context: Record<string, any>;
	attachments?: Array<{
		filename: string;
		path: string;
	}>;
}

/**
 * Job data interface for image processing queue
 * Used by the image processor to perform operations on uploaded images
 */
export interface ImageJobData {
	fileKey: string;
	operations: ImageOperation[];
	outputFormats: string[];
}

/**
 * Job data interface for notification queue
 * Used by the notification processor to send user notifications
 */
export interface NotificationJobData {
	userId: string;
	type: NotificationType;
	title: string;
	body: string;
	data?: Record<string, any>;
}

/**
 * Enum for supported image operations
 */
export enum ImageOperation {
	RESIZE = 'resize',
	COMPRESS = 'compress',
	THUMBNAIL = 'thumbnail',
	WATERMARK = 'watermark',
}

/**
 * Enum for notification types
 */
export enum NotificationType {
	INFO = 'info',
	WARNING = 'warning',
	SUCCESS = 'success',
	ERROR = 'error',
}

/**
 * Interface for job status monitoring
 * Used to track the state and progress of background jobs
 */
export interface JobStatus {
	id: string;
	state: string;
	progress: unknown;
	returnvalue: unknown;
	failedReason?: string;
}

/**
 * Queue options interface for configuring job behavior
 * Extends basic job options with common queue configuration
 */
export interface QueueJobOptions {
	/**
	 * Number of times to retry failed jobs
	 */
	attempts?: number;

	/**
	 * Backoff strategy for retries
	 */
	backoff?: {
		type: 'fixed' | 'exponential';
		delay: number;
	};

	/**
	 * Job priority (higher number = higher priority)
	 */
	priority?: number;

	/**
	 * Delay in milliseconds before job is processed
	 */
	delay?: number;

	/**
	 * Job timeout in milliseconds
	 */
	timeout?: number;

	/**
	 * Remove job from queue when completed
	 */
	removeOnComplete?: boolean | number;

	/**
	 * Remove job from queue when failed
	 */
	removeOnFail?: boolean | number;
}
