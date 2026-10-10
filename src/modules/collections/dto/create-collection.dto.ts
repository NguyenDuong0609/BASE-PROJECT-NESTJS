import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
	IsBoolean,
	IsEnum,
	IsNotEmpty,
	IsOptional,
	MaxLength,
	IsUrl,
} from 'class-validator';
import { COLLECTION_LEVEL } from '../entities/collection.entity';

export class CreateCollectionDto {
	@ApiProperty({
		example: 'TOEIC Vocabulary Mastery',
		description: 'Collection name',
	})
	@IsNotEmpty()
	@MaxLength(100)
	name: string;

	@ApiProperty({
		example:
			'Essential 600 words for TOEIC test preparation with definitions and examples',
		description: 'Collection description',
		required: false,
	})
	@IsOptional()
	description: string;

	@ApiProperty({
		enum: COLLECTION_LEVEL,
		example: COLLECTION_LEVEL.MEDIUM,
		description: 'Difficulty level of the collection',
	})
	@IsEnum(COLLECTION_LEVEL)
	level: COLLECTION_LEVEL;

	@ApiProperty({
		example: 'https://example.com/toeic-cover.jpg',
		description:
			'Optional external HTTPS image URL; upload a file for private storage',
		required: false,
	})
	@Transform(({ value }) => (value === '' ? undefined : value))
	@IsOptional()
	@IsUrl({ protocols: ['https'], require_protocol: true })
	image: string;

	@ApiProperty({
		example: true,
		description: 'Whether the collection is publicly visible',
		required: false,
	})
	@IsOptional()
	@Transform(({ value }) =>
		value === 'true' ? true : value === 'false' ? false : value,
	)
	@IsBoolean()
	is_public: boolean;
}
