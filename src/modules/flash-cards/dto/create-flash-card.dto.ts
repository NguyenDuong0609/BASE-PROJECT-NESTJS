import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
	ArrayMinSize,
	IsArray,
	IsNotEmpty,
	IsOptional,
	IsUrl,
} from 'class-validator';

export class CreateFlashCardDto {
	@ApiProperty({
		example: 'Serendipity',
		description: 'Vocabulary word or term',
	})
	@IsNotEmpty()
	vocabulary: string;

	@ApiProperty({
		example: 'https://example.com/serendipity.jpg',
		description:
			'Optional external HTTPS image URL; upload a file for private storage',
		required: false,
	})
	@Transform(({ value }) => (value === '' ? undefined : value))
	@IsOptional()
	@IsUrl({ protocols: ['https'], require_protocol: true })
	image: string;

	@ApiProperty({
		example:
			'The occurrence and development of events by chance in a happy or beneficial way',
		description: 'Definition in English',
	})
	@IsNotEmpty()
	definition: string;

	@ApiProperty({
		example: 'Sự tình cờ may mắn',
		description: 'Translation or meaning',
	})
	@IsNotEmpty()
	meaning: string;

	@ApiProperty({
		example: ['Finding this rare book was pure serendipity.'],
		description: 'Example sentences',
		required: false,
	})
	@IsOptional()
	@IsArray()
	@ArrayMinSize(1)
	examples?: string[];

	@ApiProperty({
		example: 'ˌserənˈdipədē',
		description: 'Phonetic pronunciation',
		required: false,
	})
	@IsOptional()
	pronunciation: string;
}
