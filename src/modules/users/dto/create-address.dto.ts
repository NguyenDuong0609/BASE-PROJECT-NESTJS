import { ApiProperty } from '@nestjs/swagger';
import {
	IsNotEmpty,
	IsOptional,
	IsInt,
	MaxLength,
	MinLength,
} from 'class-validator';

export class CreateAddressDto {
	@ApiProperty({
		example: '123 Main Street',
		description: 'Street name and number',
		required: false,
	})
	@IsOptional()
	@MinLength(2)
	@MaxLength(120)
	street?: string;

	@ApiProperty({
		example: 'California',
		description: 'State or province',
	})
	@IsNotEmpty()
	@MinLength(2)
	@MaxLength(50)
	state: string;

	@ApiProperty({
		example: 'Los Angeles',
		description: 'City name',
	})
	@IsNotEmpty()
	@MinLength(2)
	@MaxLength(50)
	city: string;

	@ApiProperty({
		example: 90001,
		description: 'Postal or Zip code',
		required: false,
	})
	@IsOptional()
	@IsInt()
	postal_code: number;

	@ApiProperty({
		example: 'United States',
		description: 'Country name',
	})
	@IsNotEmpty()
	@MinLength(2)
	@MaxLength(50)
	country: string;
}
