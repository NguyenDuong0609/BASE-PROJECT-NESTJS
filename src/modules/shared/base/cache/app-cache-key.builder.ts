import { createHash } from 'node:crypto';

type NormalizedNode = [string, ...(string | NormalizedNode)[]];

export class AppCacheKeyBuilder {
	static build(dimensions: unknown): string {
		const normalized = this.normalize(dimensions, new WeakSet<object>());
		const serialized = JSON.stringify(normalized);
		return `v1:${createHash('sha256').update(serialized).digest('hex')}`;
	}

	private static normalize(
		value: unknown,
		ancestors: WeakSet<object>,
	): NormalizedNode {
		if (value === null) return ['null'];
		if (typeof value === 'string') return ['string', value];
		if (typeof value === 'boolean') return ['boolean', String(value)];

		if (typeof value === 'number') {
			if (!Number.isFinite(value)) {
				throw new TypeError('Cache key numbers must be finite');
			}
			return ['number', Object.is(value, -0) ? '-0' : String(value)];
		}

		if (value instanceof Date) {
			if (Number.isNaN(value.getTime())) {
				throw new TypeError('Cache key dates must be valid');
			}
			return ['date', value.toISOString()];
		}

		if (Array.isArray(value)) {
			this.assertNotCircular(value, ancestors);
			try {
				return [
					'array',
					...value.map((item) => {
						if (item === undefined) {
							throw new TypeError(
								'Cache key arrays cannot contain undefined values',
							);
						}
						return this.normalize(item, ancestors);
					}),
				];
			} finally {
				ancestors.delete(value);
			}
		}

		if (typeof value === 'object' && value !== null) {
			const prototype = Object.getPrototypeOf(value);
			if (prototype !== Object.prototype && prototype !== null) {
				throw new TypeError('Cache key values must be plain objects');
			}

			this.assertNotCircular(value, ancestors);
			try {
				const properties: NormalizedNode[] = [];
				for (const key of Object.keys(value).sort()) {
					const entry = (value as Record<string, unknown>)[key];
					if (entry !== undefined) {
						properties.push([
							'property',
							key,
							this.normalize(entry, ancestors),
						]);
					}
				}
				return ['object', ...properties];
			} finally {
				ancestors.delete(value);
			}
		}

		throw new TypeError(
			'Cache key values must be JSON-compatible primitives, arrays, plain objects, or dates',
		);
	}

	private static assertNotCircular(
		value: object,
		ancestors: WeakSet<object>,
	): void {
		if (ancestors.has(value)) {
			throw new TypeError(
				'Cache key values cannot contain circular references',
			);
		}
		ancestors.add(value);
	}
}
