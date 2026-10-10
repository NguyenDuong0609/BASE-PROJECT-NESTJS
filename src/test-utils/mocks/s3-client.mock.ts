/**
 * S3 Client Mock Strategy
 *
 * Provides mock implementation for AWS S3 Client commands
 * Used in tests to avoid actual S3 calls
 */

// TEMPORARILY DISABLED - missing dependency 'aws-sdk-client-mock'
// import { mockClient } from 'aws-sdk-client-mock';
export class S3ClientMock {
	private static instance: any;

	static create() {
		// Temporarily disabled - missing aws-sdk-client-mock package
		return this.instance;
	}

	static reset() {
		// Temporarily disabled
	}

	static mockUploadSuccess() {
		// Temporarily disabled
	}

	static mockUploadFailure() {
		// Temporarily disabled
	}

	static mockGetObjectSuccess() {
		// Temporarily disabled
	}

	static mockDeleteSuccess() {
		// Temporarily disabled
	}

	static mockListObjectsSuccess() {
		// Temporarily disabled
	}
}

/**
 * Usage example:
 *
 * beforeEach(() => {
 *   S3ClientMock.create();
 *   S3ClientMock.mockUploadSuccess();
 * });
 *
 * afterEach(() => {
 *   S3ClientMock.reset();
 * });
 */
