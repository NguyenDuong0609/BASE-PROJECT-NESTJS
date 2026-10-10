import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
	ArrayMinSize,
	IsArray,
	IsEmail,
	IsEnum,
	IsNotEmpty,
	IsOptional,
	IsStrongPassword,
	MaxLength,
	ValidateNested,
} from 'class-validator';
import { LANGUAGES } from '../entities/user.entity';
import { CreateAddressDto } from './create-address.dto';

export class CreateUserDto {
	@ApiProperty({
		example: 'John',
		description: 'First name',
	})
	@IsNotEmpty()
	@MaxLength(50)
	first_name: string;

	@ApiProperty({
		example: 'Doe',
		description: 'Last name',
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
		example: 'johndoe',
		description: 'Unique username',
	})
	@IsNotEmpty()
	@MaxLength(50)
	username: string;

	@ApiProperty({
		example: '+14155552671',
		description: 'Phone number',
		required: false,
	})
	@IsOptional()
	// @IsPhoneNumber()
	phone_number?: string;

	@ApiProperty({
		example: 'ExamplePass123!',
		description: 'Strong password',
	})
	@IsNotEmpty()
	@IsStrongPassword()
	password: string;

	@ApiProperty({
		type: [CreateAddressDto],
		example: [
			{
				street: '123 Main Street',
				state: 'California',
				city: 'Los Angeles',
				postal_code: 90001,
				country: 'United States',
			},
		],
		required: false,
	})
	@IsOptional()
	@IsArray()
	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => CreateAddressDto)
	address?: CreateAddressDto[];

	@ApiProperty({
		enum: LANGUAGES,
		isArray: true,
		example: [LANGUAGES.ENGLISH, LANGUAGES.SPANISH],
		required: false,
	})
	@IsOptional()
	@IsArray()
	@ArrayMinSize(1)
	@IsEnum(LANGUAGES, { each: true })
	interested_languages?: LANGUAGES[];
}
