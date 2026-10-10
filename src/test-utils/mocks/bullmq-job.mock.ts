/**
 * BullMQ Job Mock Utilities
 *
 * Provides mock job instances for testing queue processors
 */

export class BullMQJobMock {
	static createMockJob<T = any>(data: T, overrides?: any) {
		return {
			id: 'mock-job-id',
			name: 'mock-job',
			data,
			opts: {
				attempts: 3,
				backoff: {
					type: 'exponential',
					delay: 1000,
				},
			},
			attemptsMade: 0,
			timestamp: Date.now(),
			processedOn: Date.now(),
			finishedOn: null,
			returnvalue: null,
			progress: jest.fn(),
			update: jest.fn(),
			log: jest.fn(),
			getState: jest.fn().mockResolvedValue('active'),
			...overrides,
		};
	}

	static createCompletedJob<T = any>(data: T, returnvalue: any) {
		return this.createMockJob(data, {
			finishedOn: Date.now(),
			returnvalue,
			getState: jest.fn().mockResolvedValue('completed'),
		});
	}

	static createFailedJob<T = any>(data: T, error: Error) {
		return this.createMockJob(data, {
			failedReason: error.message,
			finishedOn: Date.now(),
			getState: jest.fn().mockResolvedValue('failed'),
		});
	}
}

/**
 * Usage example:
 *
 * const job = BullMQJobMock.createMockJob({ to: 'test@example.com' });
 * await emailProcessor.process(job);
 */
