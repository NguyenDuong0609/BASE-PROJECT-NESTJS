import { ApiProperty } from '@nestjs/swagger';
import {
	IsEmail,
	IsNotEmpty,
	IsStrongPassword,
	MaxLength,
} from 'class-validator';
export class SignUpDto {
	@ApiProperty({
		example: 'John',
		description: 'User first name',
	})
	@IsNotEmpty()
	@MaxLength(50)
	first_name: string;

	@ApiProperty({
		example: 'Doe',
		description: 'User last name',
	})
	@IsNotEmpty()
	@MaxLength(50)
	last_name: string;

	@ApiProperty({
		example: 'johndoe@example.com',
		description: 'User email address',
	})
	@IsNotEmpty()
	@MaxLength(50)
	@IsEmail()
	email: string;

	@ApiProperty({
		example: 'ExamplePass123!',
		description: 'Strong password',
	})
	@IsNotEmpty()
	@IsStrongPassword()
	password: string;
}
