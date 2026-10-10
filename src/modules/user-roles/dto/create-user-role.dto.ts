import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, MinLength } from 'class-validator';
import { USER_ROLE } from '../entities/user-role.entity';

export class CreateUserRoleDto {
	@ApiProperty({
		enum: USER_ROLE,
		example: USER_ROLE.TEAM_LEADER,
		description: 'Role name',
	})
	@IsEnum(USER_ROLE)
	name: USER_ROLE;

	@ApiProperty({
		example: 'Standard user role with default access rights',
		description: 'Role description',
		required: false,
	})
	@IsOptional()
	@MinLength(1)
	description: string;
}
