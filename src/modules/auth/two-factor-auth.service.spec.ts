import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { TwoFactorAuthService } from './two-factor-auth.service';
import { User } from '../users/entities/user.entity';

jest.mock('otplib', () => ({
	TOTP: class {
		generateSecret() {
			return 'JBSWY3DPEHPK3PXP';
		}
		async verify(token: string) {
			return {
				valid: token === '123456',
				timeStep: Math.floor(Date.now() / 30_000),
			};
		}
	},
	NobleCryptoPlugin: class {},
	ScureBase32Plugin: class {},
}));

describe('TwoFactorAuthService', () => {
	const key = 'a'.repeat(64);
	let user: User;
	let users: jest.Mocked<UsersService>;
	let service: TwoFactorAuthService;

	beforeEach(() => {
		user = {
			id: 'user-1',
			email: 'user@example.test',
			isTwoFactorAuthenticationEnabled: false,
			twoFactorAuthenticationSecret: null,
		} as User;
		users = {
			update: jest.fn(async (_id, values) => Object.assign(user, values)),
			findOne: jest.fn(async () => user),
			consumeTwoFactorCounter: jest
				.fn()
				.mockResolvedValueOnce(true)
				.mockResolvedValue(false),
		} as unknown as jest.Mocked<UsersService>;
		service = new TwoFactorAuthService(users, {
			get: jest.fn().mockReturnValue('Test App'),
			getOrThrow: jest.fn().mockReturnValue(key),
		} as unknown as ConfigService);
	});

	it('encrypts the TOTP secret at rest and consumes each time-step once', async () => {
		const enrollment =
			await service.generateTwoFactorAuthenticationSecret(user);
		expect(enrollment.otpauthUrl).toContain('otpauth://totp/');
		expect(user.twoFactorAuthenticationSecret).toMatch(/^v1:/);
		expect(user.twoFactorAuthenticationSecret).not.toContain(enrollment.secret);

		await expect(service.verifyUserCode(user.id, '123456')).resolves.toBe(true);
		await expect(service.verifyUserCode(user.id, '123456')).resolves.toBe(
			false,
		);
		expect(users.consumeTwoFactorCounter).toHaveBeenCalledTimes(2);
	});
});
