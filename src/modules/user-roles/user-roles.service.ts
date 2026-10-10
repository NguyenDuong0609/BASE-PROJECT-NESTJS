import { Inject, Injectable } from '@nestjs/common';
import { BaseServiceAbstract } from 'src/services/base/base.abstract.service';
import { UserRole } from './entities/user-role.entity';
import { UserRolesRepositoryInterface } from './interfaces/user-roles.interface';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Injectable()
export class UserRolesService extends BaseServiceAbstract<UserRole> {
	constructor(
		@Inject('UserRolesRepositoryInterface')
		private readonly userRolesRepository: UserRolesRepositoryInterface,
	) {
		super(userRolesRepository);
	}

	async remove(id: string): Promise<boolean> {
		return this.userRolesRepository.removeIfUnassigned(id);
	}

	createInTransaction(data: Partial<UserRole>, manager: EntityManager) {
		const repository = manager.getRepository(UserRole);
		return repository.save(repository.create(data));
	}

	async updateInTransaction(
		id: string,
		data: Partial<UserRole>,
		manager: EntityManager,
	): Promise<UserRole> {
		const repository = manager.getRepository(UserRole);
		const role = await repository.findOneBy({ id });
		if (!role) throw new NotFoundException(`Record not found: ${id}`);
		Object.assign(role, data);
		return repository.save(role);
	}

	async removeInTransaction(id: string, manager: EntityManager): Promise<void> {
		const roleRepository = manager.getRepository(UserRole);
		const userRepository = manager.getRepository(User);
		const role = await roleRepository.findOne({
			where: { id },
			lock: { mode: 'pessimistic_write' },
		});
		if (!role) throw new NotFoundException(`Record not found: ${id}`);
		if (await userRepository.exist({ where: { role: { id } } })) {
			throw new ConflictException('Cannot delete a role assigned to users');
		}
		await roleRepository.softRemove(role);
	}
}
