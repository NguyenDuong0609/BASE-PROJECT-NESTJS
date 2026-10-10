import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import {
	IsDateString,
	IsEnum,
	IsOptional,
	IsPhoneNumber,
	MaxLength,
} from 'class-validator';
import { GENDER } from '../entities/user.entity';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
	OmitType(CreateUserDto, ['email', 'password', 'username'] as const),
) {
	@ApiProperty({
		example: '+14155552671',
		description: 'Phone number',
		required: false,
	})
	@IsOptional()
	@IsPhoneNumber()
	phone_number?: string;

	@ApiProperty({
		example: '1995-05-15',
		description: 'Date of birth (YYYY-MM-DD)',
		required: false,
	})
	@IsOptional()
	@IsDateString()
	date_of_birth?: Date;

	@ApiProperty({
		enum: GENDER,
		example: GENDER.MALE,
		description: 'User gender',
		required: false,
	})
	@IsOptional()
	@IsEnum(GENDER)
	gender?: GENDER;

	@ApiProperty({
		example: 'Passionate language learner & flash card creator',
		description: 'Short user bio/headline',
		required: false,
	})
	@IsOptional()
	@MaxLength(200)
	headline?: string;
}

export class UpdateStudentCardDto {
	student_card_front: string;

	student_card_back: string;
}
