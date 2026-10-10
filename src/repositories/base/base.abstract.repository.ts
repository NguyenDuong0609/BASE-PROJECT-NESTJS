import { BaseEntity } from '@modules/shared/base/base.entity';
import { FindAllResponse } from 'src/types/common.type';
import { BaseRepositoryInterface } from './base.interface.repository';
import {
	Repository,
	FindManyOptions,
	FindOptionsWhere,
	DeepPartial,
	FindOneOptions,
} from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getErrorCode } from '../../shared/error-utils';

export abstract class BaseRepositoryAbstract<
	T extends BaseEntity,
> implements BaseRepositoryInterface<T> {
	protected constructor(protected readonly repository: Repository<T>) {}

	async create(dto: DeepPartial<T>): Promise<T> {
		try {
			const created_data = this.repository.create(dto);
			return await this.repository.save(created_data as DeepPartial<T>);
		} catch (error) {
			if (getErrorCode(error) === '23505') {
				throw new ConflictException(
					'A record with these values already exists',
				);
			}
			throw error;
		}
	}

	async findOneById(id: string, options?: FindOneOptions<T>): Promise<T> {
		return await this.repository.findOne({
			where: { id } as unknown as FindOptionsWhere<T>,
			...options,
		});
	}

	async findOneByCondition(condition: FindOptionsWhere<T>): Promise<T> {
		return await this.repository.findOne({ where: condition });
	}

	async findAll(options?: FindManyOptions<T>): Promise<FindAllResponse<T>> {
		const [items, count] = await this.repository.findAndCount(options);
		return { count, items };
	}

	async update(id: string, dto: DeepPartial<T>): Promise<T> {
		try {
			const result = await this.repository.update(id, dto as any);
			if (!result.affected) {
				throw new NotFoundException(`Record not found: ${id}`);
			}
			return await this.findOneById(id);
		} catch (error) {
			if (getErrorCode(error) === '23505') {
				throw new ConflictException(
					'A record with these values already exists',
				);
			}
			throw error;
		}
	}

	async softDelete(id: string): Promise<boolean> {
		const delete_item = await this.findOneById(id);
		if (!delete_item) {
			throw new NotFoundException(`Record not found: ${id}`);
		}
		await this.repository.softRemove(delete_item);
		return true;
	}

	async permanentlyDelete(id: string): Promise<boolean> {
		const delete_item = await this.findOneById(id);
		if (!delete_item) {
			return false;
		}
		await this.repository.remove(delete_item);
		return true;
	}
}
