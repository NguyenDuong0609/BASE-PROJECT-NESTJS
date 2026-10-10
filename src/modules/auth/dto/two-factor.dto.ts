import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class TwoFactorSetupDto {
	@ApiProperty({ minLength: 12 })
	@IsString()
	@MinLength(12)
	password: string;
}

export class TwoFactorCodeDto {
	@ApiProperty({ pattern: '^\\d{6}$' })
	@Matches(/^\d{6}$/)
	code: string;
}

export class TwoFactorDisableDto extends TwoFactorCodeDto {
	@ApiProperty({ minLength: 12 })
	@IsString()
	@MinLength(12)
	password: string;
}

export class TwoFactorChallengeDto extends TwoFactorCodeDto {
	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	challengeToken?: string;
}
