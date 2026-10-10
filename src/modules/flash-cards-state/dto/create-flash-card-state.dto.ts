import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFlashCardStateDto {
	@ApiProperty({
		example: 'What is NestJS?',
		description: 'Flash card title',
	})
	@IsNotEmpty()
	@IsString()
	title: string;

	@ApiProperty({
		example:
			'What progressive Node.js framework is built on top of Express/Fastify?',
		description: 'Flash card question',
	})
	@IsNotEmpty()
	@IsString()
	question: string;

	@ApiProperty({
		example: 'NestJS',
		description: 'Flash card answer',
	})
	@IsNotEmpty()
	@IsString()
	answer: string;
}
