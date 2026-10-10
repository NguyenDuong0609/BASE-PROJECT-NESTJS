import {
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepositoryAbstract } from './base/base.abstract.repository';
import { UserRole } from '@modules/user-roles/entities/user-role.entity';
import { UserRolesRepositoryInterface } from '@modules/user-roles/interfaces/user-roles.interface';
import { User } from '@modules/users/entities/user.entity';

@Injectable()
export class UserRolesRepository
	extends BaseRepositoryAbstract<UserRole>
	implements UserRolesRepositoryInterface
{
	constructor(
		@InjectRepository(UserRole)
		private readonly userRoleRepository: Repository<UserRole>,
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
	) {
		super(userRoleRepository);
	}

	async removeIfUnassigned(id: string): Promise<boolean> {
		return this.userRepository.manager.transaction(async (manager) => {
			const role = await manager.getRepository(UserRole).findOne({
				where: { id },
				lock: { mode: 'pessimistic_write' },
			});
			if (!role) {
				throw new NotFoundException(`Record not found: ${id}`);
			}

			const assignedUsers = await manager
				.getRepository(User)
				.count({ where: { role: { id } } });
			if (assignedUsers > 0) {
				throw new ConflictException('Cannot delete a role assigned to users');
			}

			await manager.getRepository(UserRole).softRemove(role);
			return true;
		});
	}
}
