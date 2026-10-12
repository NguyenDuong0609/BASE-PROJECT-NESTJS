import {
	ConflictException,
	Inject,
	Injectable,
	NotFoundException,
	Optional,
} from '@nestjs/common';
import { BaseServiceAbstract } from 'src/services/base/base.abstract.service';
import { UserRole } from './entities/user-role.entity';
import { UserRolesRepositoryInterface } from './interfaces/user-roles.interface';
import { DeepPartial, EntityManager, FindManyOptions } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { AppCacheService } from '@modules/shared/base/cache/app-cache.service';
import { AppCacheKeyBuilder } from '@modules/shared/base/cache/app-cache-key.builder';
import { instanceToPlain } from 'class-transformer';

const USER_ROLES_CACHE_NAMESPACE = 'user-roles';
const USER_ROLES_CACHE_TTL_MS = 60_000;

@Injectable()
export class UserRolesService extends BaseServiceAbstract<UserRole> {
	constructor(
		@Inject('UserRolesRepositoryInterface')
		private readonly userRolesRepository: UserRolesRepositoryInterface,
		@Optional() private readonly cache?: AppCacheService,
	) {
		super(userRolesRepository);
	}

	override async create(createDto: DeepPartial<UserRole>): Promise<UserRole> {
		const created = await super.create(createDto);
		await this.cache?.invalidate(USER_ROLES_CACHE_NAMESPACE);
		return created;
	}

	override async findAll(options?: FindManyOptions<UserRole>) {
		if (!this.cache) {
			return super.findAll(options);
		}
		return this.cache.getOrSet(
			USER_ROLES_CACHE_NAMESPACE,
			AppCacheKeyBuilder.build({
				route: '/user-roles',
				query: {
					skip: options?.skip ?? 0,
					take: options?.take ?? 20,
				},
			}),
			USER_ROLES_CACHE_TTL_MS,
			() => super.findAll(options),
			(val) => val,
		);
	}

	override async findOne(id: string): Promise<UserRole> {
		if (!this.cache) {
			return super.findOne(id);
		}
		return this.cache.getOrSet(
			USER_ROLES_CACHE_NAMESPACE,
			AppCacheKeyBuilder.build({
				route: '/user-roles/:id',
				params: { id },
			}),
			USER_ROLES_CACHE_TTL_MS,
			() => super.findOne(id),
			(val) => val,
		);
	}

	override async update(
		id: string,
		updateDto: DeepPartial<UserRole>,
	): Promise<UserRole> {
		const updated = await super.update(id, updateDto);
		await this.cache?.invalidate(USER_ROLES_CACHE_NAMESPACE);
		return updated;
	}

	async remove(id: string): Promise<boolean> {
		const removed = await this.userRolesRepository.removeIfUnassigned(id);
		if (removed) {
			await this.cache?.invalidate(USER_ROLES_CACHE_NAMESPACE);
		}
		return removed;
	}

	async createInTransaction(data: Partial<UserRole>, manager: EntityManager) {
		const repository = manager.getRepository(UserRole);
		if (data.name) {
			const existing = await repository.findOne({
				where: { name: data.name },
				withDeleted: true,
			});
			if (existing) {
				throw new ConflictException(`Role '${data.name}' already exists`);
			}
		}
		const saved = await repository.save(repository.create(data));
		await this.cache?.invalidate(USER_ROLES_CACHE_NAMESPACE);
		return saved;
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
		const saved = await repository.save(role);
		await this.cache?.invalidate(USER_ROLES_CACHE_NAMESPACE);
		return saved;
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
		await this.cache?.invalidate(USER_ROLES_CACHE_NAMESPACE);
	}
}
