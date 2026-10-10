import { User } from '@modules/users/entities/user.entity';
import { BaseRepositoryInterface } from '@repositories/base/base.interface.repository';
import { FindAllResponse } from 'src/types/common.type';
import { FindOptionsWhere } from 'typeorm';

export interface UsersRepositoryInterface extends BaseRepositoryInterface<User> {
	findAllWithSubFields(
		condition: FindOptionsWhere<User>,
		options: {
			projection?: string[];
			populate?: string[] | any;
			offset?: number;
			limit?: number;
		},
	): Promise<FindAllResponse<User>>;
	getUserWithRole(user_id: string): Promise<User>;
	consumeCurrentRefreshToken(
		id: string,
		expectedHash: string,
	): Promise<boolean>;
	consumeTwoFactorCounter(id: string, counter: number): Promise<boolean>;
}
