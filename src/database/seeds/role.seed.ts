import { DataSource } from 'typeorm';
import { UserRole } from '../../modules/user-roles/entities/user-role.entity';
import { createContextLogger } from '../../configs/logger.config';

const logger = createContextLogger('RoleSeed');

export async function seedRoles(dataSource: DataSource) {
	const roleRepo = dataSource.getRepository(UserRole);

	const roles = [
		{ name: 'Admin', description: 'System Administrator' },
		{ name: 'User', description: 'Regular User' },
	];

	for (const roleData of roles) {
		const existingRole = await roleRepo.findOne({
			where: { name: roleData.name },
		});
		if (!existingRole) {
			const role = roleRepo.create(roleData);
			await roleRepo.save(role);
			logger.info({ role: role.name }, 'Seeded role');
		} else {
			logger.debug({ role: existingRole.name }, 'Role already exists');
		}
	}
}
