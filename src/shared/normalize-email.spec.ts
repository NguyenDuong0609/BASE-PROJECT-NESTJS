import { normalizeEmail } from './normalize-email';

describe('normalizeEmail', () => {
	it('trims whitespace and canonicalizes case', () => {
		expect(normalizeEmail('  User@Example.COM ')).toBe('user@example.com');
	});
});
