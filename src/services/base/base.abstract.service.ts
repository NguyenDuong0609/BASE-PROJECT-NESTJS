import { BaseEntity } from '@modules/shared/base/base.entity';
import { BaseRepositoryInterface } from '@repositories/base/base.interface.repository';
import { FindAllResponse } from 'src/types/common.type';
import { BaseServiceInterface } from './base.interface.service';
import { DeepPartial, FindManyOptions, FindOptionsWhere } from 'typeorm';

export abstract class BaseServiceAbstract<
	T extends BaseEntity,
> implements BaseServiceInterface<T> {
	constructor(private readonly repository: BaseRepositoryInterface<T>) {}

	async create(createDto: DeepPartial<T> | any): Promise<T> {
		return await this.repository.create(createDto);
	}

	async findAll(options?: FindManyOptions<T>): Promise<FindAllResponse<T>> {
		return await this.repository.findAll(options);
	}

	async findOne(id: string): Promise<T> {
		return await this.repository.findOneById(id);
	}

	async findOneByCondition(filter: FindOptionsWhere<T>): Promise<T> {
		return await this.repository.findOneByCondition(filter);
	}

	async update(id: string, updateDto: DeepPartial<T> | any): Promise<T> {
		return await this.repository.update(id, updateDto);
	}

	async remove(id: string): Promise<boolean> {
		return await this.repository.softDelete(id);
	}
}
