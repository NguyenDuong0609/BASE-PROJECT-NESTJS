import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { UserRole } from '../user-roles/entities/user-role.entity';

@Injectable()
export class PermissionsService {
	constructor(
		@InjectRepository(Permission)
		private readonly permissions: Repository<Permission>,
		@InjectRepository(UserRole)
		private readonly roles: Repository<UserRole>,
	) {}

	list() {
		return this.permissions.find({ order: { code: 'ASC' } });
	}

	listRoles() {
		return this.roles.find({ order: { name: 'ASC' } });
	}

	async replaceRolePermissions(
		roleId: string,
		codes: string[],
		manager?: EntityManager,
	): Promise<UserRole> {
		const roleRepository = manager?.getRepository(UserRole) ?? this.roles;
		const permissionRepository =
			manager?.getRepository(Permission) ?? this.permissions;
		const role = await roleRepository.findOne({ where: { id: roleId } });
		if (!role) throw new NotFoundException('Role not found');
		const permissions = codes.length
			? await permissionRepository.find({ where: { code: In(codes) } })
			: [];
		if (permissions.length !== new Set(codes).size) {
			throw new NotFoundException('One or more permission codes do not exist');
		}
		role.permissions = permissions;
		return roleRepository.save(role);
	}

	async hasAll(roleId: string, requiredCodes: string[]): Promise<boolean> {
		if (requiredCodes.length === 0) return true;
		const role = await this.roles.findOne({
			where: { id: roleId },
			relations: { permissions: true },
		});
		if (!role) return false;
		const granted = new Set((role.permissions ?? []).map(({ code }) => code));
		return requiredCodes.every((code) => granted.has(code));
	}
}
