import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRootCommentDto {
	@ApiProperty({
		example: 'This is a great flashcard set! Thanks for sharing.',
		description: 'Comment content',
	})
	@IsString()
	@IsNotEmpty()
	@MaxLength(10_000)
	content: string;
}

export class CreateReplyDto extends CreateRootCommentDto {
	@ApiProperty({
		example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b',
		description: 'Post UUID',
	})
	@IsString()
	@IsNotEmpty()
	@MaxLength(128)
	postId: string;
}

export class UpdateCommentDto {
	@ApiProperty({
		example: 'Updated comment text content.',
		description: 'Updated comment content',
	})
	@IsString()
	@IsNotEmpty()
	@MaxLength(10_000)
	content: string;
}
