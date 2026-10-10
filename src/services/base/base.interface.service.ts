import { FindAllResponse } from 'src/types/common.type';
import { FindManyOptions, FindOptionsWhere, DeepPartial } from 'typeorm';

export interface Write<T> {
	create(item: DeepPartial<T> | any): Promise<T>;
	update(id: string, item: DeepPartial<T> | any): Promise<T>;
	remove(id: string): Promise<boolean>;
}

export interface Read<T> {
	findAll(options?: FindManyOptions<T>): Promise<FindAllResponse<T>>;
	findOne(id: string): Promise<T>;
	findOneByCondition(filter: FindOptionsWhere<T>): Promise<T>;
}

export interface BaseServiceInterface<T> extends Write<T>, Read<T> {}
