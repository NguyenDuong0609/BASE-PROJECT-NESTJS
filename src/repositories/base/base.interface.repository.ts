import { FindAllResponse } from 'src/types/common.type';
import {
	FindManyOptions,
	FindOptionsWhere,
	DeepPartial,
	FindOneOptions,
} from 'typeorm';

export interface BaseRepositoryInterface<T> {
	create(dto: DeepPartial<T>): Promise<T>;

	findOneById(id: string, options?: FindOneOptions<T>): Promise<T>;

	findOneByCondition(condition: FindOptionsWhere<T>): Promise<T>;

	findAll(options?: FindManyOptions<T>): Promise<FindAllResponse<T>>;

	update(id: string, dto: DeepPartial<T>): Promise<T>;

	softDelete(id: string): Promise<boolean>;

	permanentlyDelete(id: string): Promise<boolean>;
}
