import { ApiProperty } from '@nestjs/swagger';
import {
	IsEmail,
	IsNotEmpty,
	IsStrongPassword,
	MaxLength,
} from 'class-validator';

export class AccountEmailDto {
	@ApiProperty({ example: 'user@example.com' })
	@IsEmail()
	@MaxLength(254)
	email: string;
}

export class AccountActionTokenDto {
	@ApiProperty()
	@IsNotEmpty()
	@MaxLength(128)
	token: string;
}

export class PasswordResetDto extends AccountActionTokenDto {
	@ApiProperty({ minLength: 8 })
	@IsNotEmpty()
	@IsStrongPassword()
	password: string;
}
