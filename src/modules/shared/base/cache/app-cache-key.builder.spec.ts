import { AppCacheKeyBuilder } from './app-cache-key.builder';

describe('AppCacheKeyBuilder', () => {
	it('builds the same key regardless of object property order', () => {
		expect(
			AppCacheKeyBuilder.build({
				route: '/flash-cards',
				query: { page: 2, filters: { status: 'public', topicId: 'topic-1' } },
			}),
		).toBe(
			AppCacheKeyBuilder.build({
				query: { filters: { topicId: 'topic-1', status: 'public' }, page: 2 },
				route: '/flash-cards',
			}),
		);
	});

	it('separates dynamic route parameters and filter combinations', () => {
		const common = {
			route: '/flash-cards/:id',
			scope: { userId: 'user-1', role: 'user' },
		};

		expect(
			AppCacheKeyBuilder.build({ ...common, params: { id: 'card-1' } }),
		).not.toBe(
			AppCacheKeyBuilder.build({ ...common, params: { id: 'card-2' } }),
		);
		expect(
			AppCacheKeyBuilder.build({
				route: '/flash-cards',
				query: { status: 'public', topicId: 'topic-1' },
			}),
		).not.toBe(
			AppCacheKeyBuilder.build({
				route: '/flash-cards',
				query: { status: 'public', topicId: 'topic-2' },
			}),
		);
	});

	it('treats undefined object properties as omitted query options', () => {
		expect(
			AppCacheKeyBuilder.build({ query: { status: undefined, page: 1 } }),
		).toBe(AppCacheKeyBuilder.build({ query: { page: 1 } }));
	});

	it('keeps different value types distinct in the canonical representation', () => {
		expect(AppCacheKeyBuilder.build({ value: 1 })).not.toBe(
			AppCacheKeyBuilder.build({ value: '1' }),
		);
		expect(
			AppCacheKeyBuilder.build({ value: new Date('2026-01-01T00:00:00.000Z') }),
		).not.toBe(AppCacheKeyBuilder.build({ value: '2026-01-01T00:00:00.000Z' }));
	});

	it.each([
		Number.NaN,
		Number.POSITIVE_INFINITY,
		() => undefined,
		Symbol('value'),
	])('rejects unsupported key value %p', (value) => {
		expect(() => AppCacheKeyBuilder.build({ value })).toThrow(TypeError);
	});

	it('rejects circular references', () => {
		const dimensions: Record<string, unknown> = {};
		dimensions.self = dimensions;

		expect(() => AppCacheKeyBuilder.build(dimensions)).toThrow(
			'Cache key values cannot contain circular references',
		);
	});
});
