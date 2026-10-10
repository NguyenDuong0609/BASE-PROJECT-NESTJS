import { User } from '@modules/users/entities/user.entity';
import { UsersRepositoryInterface } from '@modules/users/interfaces/users.interface';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { BaseRepositoryAbstract } from './base/base.abstract.repository';
import { FindAllResponse } from 'src/types/common.type';

@Injectable()
export class UsersRepository
	extends BaseRepositoryAbstract<User>
	implements UsersRepositoryInterface
{
	constructor(
		@InjectRepository(User)
		private readonly usersRepository: Repository<User>,
	) {
		super(usersRepository);
	}

	async findAllWithSubFields(
		condition: FindOptionsWhere<User>,
		options: {
			projection?: string[];
			populate?: string[] | any;
			offset?: number;
			limit?: number;
		},
	): Promise<FindAllResponse<User>> {
		const [items, count] = await this.usersRepository.findAndCount({
			where: condition,
			select: options.projection as any,
			relations: options.populate,
			skip: options.offset || 0,
			take: options.limit || 10,
		});
		return {
			count,
			items,
		};
	}

	async getUserWithRole(user_id: string): Promise<User> {
		return await this.usersRepository.findOne({
			where: { id: user_id },
			relations: ['role'],
		});
	}

	async consumeCurrentRefreshToken(
		id: string,
		expectedHash: string,
	): Promise<boolean> {
		const result = await this.usersRepository.update(
			{ id, current_refresh_token: expectedHash },
			{ current_refresh_token: null },
		);
		return result.affected === 1;
	}

	async consumeTwoFactorCounter(id: string, counter: number): Promise<boolean> {
		const result = await this.usersRepository
			.createQueryBuilder()
			.update(User)
			.set({ twoFactorLastCounter: String(counter) })
			.where(
				'"id" = :id AND ("two_factor_last_counter" IS NULL OR "two_factor_last_counter" < :counter)',
				{ id, counter },
			)
			.execute();
		return result.affected === 1;
	}
}
