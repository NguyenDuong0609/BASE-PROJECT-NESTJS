import { instanceToPlain } from 'class-transformer';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';

describe('User entity security', () => {
	it('hashes a plaintext password before persistence', async () => {
		const user = Object.assign(new User(), {
			password: 'Sufficiently-Strong1!',
		});

		await user.hashPassword();

		expect(user.password).not.toBe('Sufficiently-Strong1!');
		await expect(
			bcrypt.compare('Sufficiently-Strong1!', user.password),
		).resolves.toBe(true);
	});

	it('does not rehash a password that is already hashed', async () => {
		const hash = await bcrypt.hash('Sufficiently-Strong1!', 10);
		const user = Object.assign(new User(), { password: hash });

		await user.hashPassword();

		expect(user.password).toBe(hash);
	});

	it('omits authentication and payment secrets from serialized output', () => {
		const user = Object.assign(new User(), {
			id: 'user-id',
			email: 'user@example.test',
			password: 'password-hash',
			current_refresh_token: 'refresh-hash',
			googleId: 'provider-id',
			stripe_customer_id: 'cus-private',
		});

		const serialized = instanceToPlain(user);

		expect(serialized).toMatchObject({
			id: 'user-id',
			email: 'user@example.test',
		});
		expect(serialized).not.toHaveProperty('password');
		expect(serialized).not.toHaveProperty('current_refresh_token');
		expect(serialized).not.toHaveProperty('googleId');
		expect(serialized).not.toHaveProperty('stripe_customer_id');
	});
});
