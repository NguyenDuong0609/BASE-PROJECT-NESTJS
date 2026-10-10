import { BadRequestException } from '@nestjs/common';
import { ParsePaginationPipe } from './parse-pagination.pipe';

describe('ParsePaginationPipe', () => {
	const pipe = new ParsePaginationPipe({
		defaultValue: 20,
		minimum: 1,
		maximum: 100,
	});

	it('uses its default when an optional query parameter is omitted', () => {
		expect(pipe.transform(undefined)).toBe(20);
	});

	it('parses values within the configured bounds', () => {
		expect(pipe.transform('1')).toBe(1);
		expect(pipe.transform('100')).toBe(100);
	});

	it.each(['-1', '1.5', 'NaN', '101', '9007199254740992', '1e2'])(
		'rejects invalid pagination value %s',
		(value) => {
			expect(() => pipe.transform(value)).toThrow(BadRequestException);
		},
	);
});
