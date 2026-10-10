import {
	ArrayMaxSize,
	ArrayUnique,
	IsArray,
	IsString,
	MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReplaceRolePermissionsDto {
	@ApiProperty({
		type: [String],
		example: ['flash-cards:read', 'flash-cards:create'],
		description: 'Complete set of permission codes to assign to the role',
	})
	@IsArray()
	@ArrayUnique()
	@ArrayMaxSize(200)
	@IsString({ each: true })
	@MaxLength(120, { each: true })
	codes: string[];
}
