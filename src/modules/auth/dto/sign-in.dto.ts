import { ApiProperty } from '@nestjs/swagger';
import {
	IsEmail,
	IsNotEmpty,
	IsOptional,
	IsString,
	Matches,
} from 'class-validator';

export class SignInDto {
	@ApiProperty({
		example: 'johndoe@example.com',
		description: 'User email address',
	})
	@IsEmail()
	@IsNotEmpty()
	email: string;

	@ApiProperty({
		example: 'ExamplePass123!',
		description: 'User password',
	})
	@IsString()
	@IsNotEmpty()
	password: string;

	@ApiProperty({ required: false, pattern: '^\\d{6}$' })
	@IsOptional()
	@Matches(/^\d{6}$/)
	twoFactorCode?: string;
}
