import { assertMockProcessorAllowed } from './mock-processor-policy';
import { UnrecoverableError } from 'bullmq';

describe('Mock queue processors', () => {
	const originalNodeEnv = process.env.NODE_ENV;

	beforeEach(() => {
		process.env.NODE_ENV = 'production';
	});

	afterAll(() => {
		if (originalNodeEnv === undefined) {
			delete process.env.NODE_ENV;
		} else {
			process.env.NODE_ENV = originalNodeEnv;
		}
	});

	it.each(['Email', 'Image', 'Notification'])(
		'rejects the %s mock processor in production',
		(processorName) => {
			const assertProcessorAllowed = () =>
				assertMockProcessorAllowed(`${processorName} processor`);

			expect(assertProcessorAllowed).toThrow(UnrecoverableError);
			expect(assertProcessorAllowed).toThrow(
				`${processorName} processor has no production provider configured`,
			);
		},
	);

	it('allows mock processors outside production', () => {
		process.env.NODE_ENV = 'test';
		expect(() => assertMockProcessorAllowed('Email processor')).not.toThrow();
	});
});
