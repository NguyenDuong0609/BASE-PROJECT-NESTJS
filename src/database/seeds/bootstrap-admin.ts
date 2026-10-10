import { randomBytes } from 'node:crypto';
import { isEmail, isStrongPassword } from 'class-validator';
import { User } from '../../modules/users/entities/user.entity';
import {
	USER_ROLE,
	UserRole,
} from '../../modules/user-roles/entities/user-role.entity';
import dataSource from '../data-source';
import { normalizeEmail } from '../../shared/normalize-email';
import { createContextLogger } from '../../configs/logger.config';

const logger = createContextLogger('BootstrapAdmin');

async function bootstrapAdmin(): Promise<void> {
	const emailInput = process.env.BOOTSTRAP_ADMIN_EMAIL;
	const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
	const firstName = process.env.BOOTSTRAP_ADMIN_FIRST_NAME;
	const lastName = process.env.BOOTSTRAP_ADMIN_LAST_NAME;

	if (!emailInput || !password || !firstName || !lastName) {
		throw new Error(
			'Provide BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD, BOOTSTRAP_ADMIN_FIRST_NAME and BOOTSTRAP_ADMIN_LAST_NAME',
		);
	}

	const email = normalizeEmail(emailInput);
	if (!isEmail(email) || !isStrongPassword(password, { minLength: 12 })) {
		throw new Error('Admin email or password does not meet requirements');
	}
	if (firstName.length > 60 || lastName.length > 60) {
		throw new Error('Admin first and last name must be 60 characters or fewer');
	}

	await dataSource.initialize();
	try {
		await dataSource.transaction(async (manager) => {
			await manager.query('SELECT pg_advisory_xact_lock(8750101, 1)');
			const users = manager.getRepository(User);
			const existingAdmin = await users.findOne({
				where: { role: { name: USER_ROLE.ADMIN } },
			});
			if (existingAdmin) {
				throw new Error(
					'An Admin account already exists; bootstrap is one-time',
				);
			}
			if (await users.exist({ where: { email } })) {
				throw new Error('An account with this email already exists');
			}

			const roles = manager.getRepository(UserRole);
			let role = await roles.findOne({ where: { name: USER_ROLE.ADMIN } });
			if (!role) {
				role = await roles.save(
					roles.create({
						name: USER_ROLE.ADMIN,
						description: 'System Administrator',
					}),
				);
			}

			const username = `${email.split('@')[0].slice(0, 40)}-${randomBytes(4).toString('hex')}`;
			await users.save(
				users.create({
					email,
					password,
					username,
					first_name: firstName,
					last_name: lastName,
					isEmailVerified: true,
					role,
				}),
			);
		});
		logger.info(
			'Initial Admin account created; remove bootstrap credentials now',
		);
	} finally {
		await dataSource.destroy();
	}
}

bootstrapAdmin().catch((error: unknown) => {
	logger.error({ err: error }, 'Admin bootstrap failed');
	process.exitCode = 1;
});
