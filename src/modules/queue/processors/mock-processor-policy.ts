import { UnrecoverableError } from 'bullmq';

export function assertMockProcessorAllowed(processorName: string): void {
	if (process.env.NODE_ENV === 'production') {
		throw new UnrecoverableError(
			`${processorName} has no production provider configured`,
		);
	}
}
