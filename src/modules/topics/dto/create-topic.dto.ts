import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTopicDto {
	@ApiProperty({
		example: 'English Vocabulary',
		description: 'Topic name',
	})
	@IsNotEmpty()
	name: string;

	@ApiProperty({
		example: 'Common English words and phrases for everyday conversations',
		description: 'Topic description',
		required: false,
	})
	@IsOptional()
	description: string;
}
