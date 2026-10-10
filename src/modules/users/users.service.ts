import {
	ConflictException,
	Inject,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { BaseServiceAbstract } from 'src/services/base/base.abstract.service';
import { User } from './entities/user.entity';
import { UsersRepositoryInterface } from './interfaces/users.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRolesService } from '@modules/user-roles/user-roles.service';
import { USER_ROLE } from '@modules/user-roles/entities/user-role.entity';
import { getErrorCode } from '../../shared/error-utils';
import { FindAllResponse } from 'src/types/common.type';
import { FindManyOptions } from 'typeorm';
import { DeepPartial, EntityManager } from 'typeorm';
import { normalizeEmail } from '../../shared/normalize-email';
import { UserRole } from '@modules/user-roles/entities/user-role.entity';

@Injectable()
export class UsersService extends BaseServiceAbstract<User> {
	constructor(
		@Inject('UsersRepositoryInterface')
		private readonly usersRepository: UsersRepositoryInterface,
		private readonly userRolesService: UserRolesService,
	) {
		super(usersRepository);
	}

	/**
	 * Creates a new user with default USER role
	 *
	 * @param {CreateUserDto} createDto - User creation data including email, password, first name, and last name
	 * @returns {Promise<User>} The created user entity with assigned role
	 * @throws {ConflictException} When email already exists
	 *
	 * @example
	 * const user = await usersService.create({
	 *   email: 'user@example.com',
	 *   password: 'hashedPassword',
	 *   first_name: 'John',
	 *   last_name: 'Doe'
	 * });
	 */
	async create(createDto: CreateUserDto): Promise<User> {
		createDto = { ...createDto, email: normalizeEmail(createDto.email) };
		let user_role = await this.userRolesService.findOneByCondition({
			name: USER_ROLE.USER,
		});
		if (!user_role) {
			user_role = await this.userRolesService.create({
				name: USER_ROLE.USER,
			});
		}
		try {
			return await this.usersRepository.create({
				...createDto,
				role: user_role,
			});
		} catch (error) {
			if (getErrorCode(error) === '23505') {
				throw new ConflictException('Email or username already exists');
			}
			throw error;
		}
	}

	async createInTransaction(
		createDto: CreateUserDto,
		manager: EntityManager,
	): Promise<User> {
		const repository = manager.getRepository(User);
		let role = await manager.getRepository(UserRole).findOne({
			where: { name: USER_ROLE.USER },
		});
		if (!role) {
			role = await manager
				.getRepository(UserRole)
				.save(manager.getRepository(UserRole).create({ name: USER_ROLE.USER }));
		}
		return repository.save(
			repository.create({
				...createDto,
				email: normalizeEmail(createDto.email),
				role,
			}),
		);
	}

	async updateInTransaction(
		id: string,
		updateDto: DeepPartial<User>,
		manager: EntityManager,
	): Promise<User> {
		const repository = manager.getRepository(User);
		const user = await repository.findOneBy({ id });
		if (!user) throw new NotFoundException('User not found');
		Object.assign(user, updateDto);
		return repository.save(user);
	}

	async removeInTransaction(id: string, manager: EntityManager): Promise<void> {
		const repository = manager.getRepository(User);
		const user = await repository.findOneBy({ id });
		if (!user) throw new NotFoundException('User not found');
		await repository.softRemove(user);
	}

	/**
	 * Retrieves all users with pagination and filtering
	 *
	 * @param {FindManyOptions<User>} options - Query options including filters, pagination, and relations
	 * @returns {Promise<FindAllResponse<User>>} Paginated list of users with their roles
	 *
	 * @example
	 * const users = await usersService.findAll({ skip: 0, take: 20 });
	 */
	async findAll(
		options?: FindManyOptions<User>,
	): Promise<FindAllResponse<User>> {
		return await this.usersRepository.findAll({
			...options,
			relations: ['role'],
		});
	}

	/**
	 * Retrieves a user by their email address
	 *
	 * @param {string} email - The email address to search for
	 * @returns {Promise<User>} The user entity with the specified email
	 * @throws {NotFoundException} When no user exists with the given email
	 *
	 * @example
	 * const user = await usersService.getUserByEmail('john@example.com');
	 */
	async getUserByEmail(email: string): Promise<User> {
		const user = await this.usersRepository.findOneByCondition({ email });
		if (!user) {
			throw new NotFoundException(`User with email "${email}" not found`);
		}
		return user;
	}

	/**
	 * Retrieves a user with their role information
	 *
	 * @param {string} user_id - The user ID to lookup
	 * @returns {Promise<User>} The user entity with populated role relation
	 * @throws {NotFoundException} When user not found
	 *
	 * @example
	 * const user = await usersService.getUserWithRole('uuid-here');
	 */
	async getUserWithRole(user_id: string): Promise<User> {
		const user = await this.usersRepository.getUserWithRole(user_id);
		if (!user) {
			throw new NotFoundException('User not found');
		}
		return user;
	}

	/**
	 * Stores hashed refresh token for a user
	 *
	 * @param {string} id - User ID
	 * @param {string} hashed_token - Bcrypt-hashed refresh token
	 * @returns {Promise<void>}
	 *
	 * @example
	 * await usersService.setCurrentRefreshToken(userId, hashedToken);
	 */
	async setCurrentRefreshToken(
		id: string,
		hashed_token: string | null,
	): Promise<void> {
		await this.usersRepository.update(id, {
			current_refresh_token: hashed_token,
		});
	}

	async consumeCurrentRefreshToken(
		id: string,
		expectedHash: string,
	): Promise<boolean> {
		return this.usersRepository.consumeCurrentRefreshToken(id, expectedHash);
	}

	async consumeTwoFactorCounter(id: string, counter: number): Promise<boolean> {
		return this.usersRepository.consumeTwoFactorCounter(id, counter);
	}

	async update(id: string, updateDto: DeepPartial<User>): Promise<User> {
		const user = await this.usersRepository.findOneById(id);
		if (!user) {
			throw new NotFoundException('User not found');
		}
		Object.assign(user, updateDto);
		return this.usersRepository.create(user);
	}
}
