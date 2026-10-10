import { UserRole } from '@modules/user-roles/entities/user-role.entity';
import { GENDER, User } from '@modules/users/entities/user.entity';

export const createUserStub = (): User => {
	const user = new User();
	user.id = '643d0fb8-0a2f-99f4-1511-76c400000000';
	user.email = 'johndoe@example.com';
	user.first_name = 'John';
	user.last_name = 'Doe';
	user.password = 'strongestP@ssword';
	user.username = 'johndoe';
	user.gender = GENDER.MALE;
	user.role = 'admin' as unknown as UserRole;
	return user;
};
