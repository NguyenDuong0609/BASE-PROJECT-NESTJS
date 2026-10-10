import { PartialType } from '@nestjs/swagger';
import { CreateFlashCardStateDto } from './create-flash-card-state.dto';

export class UpdateFlashCardStateDto extends PartialType(
	CreateFlashCardStateDto,
) {}
