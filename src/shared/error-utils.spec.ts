import { getErrorCode } from './error-utils';

describe('getErrorCode', () => {
	it('returns database driver codes wrapped by TypeORM errors', () => {
		expect(getErrorCode({ driverError: { code: '23505' } })).toBe('23505');
	});
});
