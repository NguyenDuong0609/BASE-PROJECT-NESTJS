import {
	Controller,
	Get,
	Post,
	Patch,
	Param,
	Body,
	Query,
	UseGuards,
	Req,
	UseInterceptors,
	ClassSerializerInterceptor,
} from '@nestjs/common';
import {
	ApiTags,
	ApiOperation,
	ApiBearerAuth,
	ApiBody,
	ApiParam,
} from '@nestjs/swagger';
import { FlashCardsStateService } from './flash-cards-state.service';
import { CurrentUserId } from 'src/decorators/current-user.decorator';
import { UpdateFlashCardStateDto } from './dto/update-flash-card-state.dto';
import { CreateFlashCardStateDto } from './dto/create-flash-card-state.dto';
import { JwtAccessTokenGuard } from '@modules/auth/guards/jwt-access-token.guard';
import { ApiDocsPagination } from 'src/decorators/swagger-form-data.decorator';
import { RequestWithUser } from 'src/types/requests.type';
import { USER_ROLE } from '@modules/user-roles/entities/user-role.entity';
import { ApiSuccessMessage } from 'src/decorators/api-success-message.decorator';
import { FeatureFlag } from '../../decorators/feature-flag.decorator';
import { ParsePaginationPipe } from '@modules/shared/base/pipes/parse-pagination.pipe';

@ApiTags('Flash Cards State')
@FeatureFlag('flashCardStates')
@ApiBearerAuth('token')
@UseGuards(JwtAccessTokenGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('flash-cards-state')
export class FlashCardsStateController {
	constructor(private readonly flashCardsService: FlashCardsStateService) {}

	@Post()
	@ApiSuccessMessage('FLASH_CARD_DRAFT_CREATED')
	@ApiOperation({ summary: 'Create a new flash card (draft)' })
	@ApiBody({
		type: CreateFlashCardStateDto,
		examples: {
			flashcard_1: {
				value: {
					title: 'What is NestJS?',
					question: 'What progressive Node.js framework is built on top of Express/Fastify?',
					answer: 'NestJS',
				} as CreateFlashCardStateDto,
			},
			flashcard_2: {
				value: {
					title: 'What is TypeScript?',
					question: 'What is the typed superset of JavaScript that compiles to plain JavaScript?',
					answer: 'TypeScript',
				} as CreateFlashCardStateDto,
			},
		},
	})
	async create(
		@Body('title') title: string,
		@Body('question') question: string,
		@Body('answer') answer: string,
		@CurrentUserId() userId: string,
	) {
		return this.flashCardsService.create({ title, question, answer }, userId);
	}

	@Get()
	@ApiOperation({ summary: 'Get all flash cards' })
	@ApiDocsPagination('FlashCardState')
	async findAll(
		@Query(
			'limit',
			new ParsePaginationPipe({ defaultValue: 20, minimum: 1, maximum: 100 }),
		)
		limit = 20,
		@Query(
			'offset',
			new ParsePaginationPipe({
				defaultValue: 0,
				minimum: 0,
				maximum: 1_000_000,
			}),
		)
		offset = 0,
		@Req() request?: RequestWithUser,
	) {
		return this.flashCardsService.findAll(
			limit,
			offset,
			request.user.id,
			request.user.role?.name === USER_ROLE.ADMIN,
		);
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get a flash card by ID' })
	@ApiParam({
		name: 'id',
		example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b',
		description: 'Flash Card State UUID',
	})
	async findOne(@Param('id') id: string, @Req() request: RequestWithUser) {
		return this.flashCardsService.findOne(
			id,
			request.user.id,
			request.user.role?.name === USER_ROLE.ADMIN,
		);
	}

	@Patch(':id')
	@ApiSuccessMessage('FLASH_CARD_DRAFT_UPDATED')
	@ApiOperation({ summary: 'Update a flash card (draft only)' })
	@ApiParam({
		name: 'id',
		example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b',
		description: 'Flash Card State UUID',
	})
	async update(
		@Param('id') id: string,
		@Body() updateDto: UpdateFlashCardStateDto,
		@CurrentUserId() userId: string,
	) {
		return this.flashCardsService.update(id, updateDto, userId);
	}

	@Post(':id/submit')
	@ApiSuccessMessage('FLASH_CARD_SUBMITTED')
	@ApiOperation({ summary: 'Submit flash card for review' })
	@ApiParam({
		name: 'id',
		example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b',
		description: 'Flash Card State UUID',
	})
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				comment: {
					type: 'string',
					example: 'Completed first draft, ready for review.',
				},
			},
		},
	})
	async submit(
		@Param('id') id: string,
		@Body('comment') comment: string,
		@CurrentUserId() userId: string,
	) {
		return this.flashCardsService.submit(id, userId, comment);
	}

	@Post(':id/approve')
	@ApiSuccessMessage('FLASH_CARD_APPROVED')
	@ApiOperation({ summary: 'Approve flash card (team leader/admin only)' })
	@ApiParam({
		name: 'id',
		example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b',
		description: 'Flash Card State UUID',
	})
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				comment: {
					type: 'string',
					example: 'Approved. Content is accurate.',
				},
			},
		},
	})
	async approve(
		@Param('id') id: string,
		@Body('comment') comment: string,
		@CurrentUserId() userId: string,
	) {
		return this.flashCardsService.approve(id, userId, comment);
	}

	@Post(':id/reject')
	@ApiSuccessMessage('FLASH_CARD_REJECTED')
	@ApiOperation({ summary: 'Reject flash card (back to draft)' })
	@ApiParam({
		name: 'id',
		example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b',
		description: 'Flash Card State UUID',
	})
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				comment: {
					type: 'string',
					example: 'Please fix typo in question.',
				},
			},
		},
	})
	async reject(
		@Param('id') id: string,
		@Body('comment') comment: string,
		@CurrentUserId() userId: string,
	) {
		return this.flashCardsService.reject(id, userId, comment);
	}

	@Post(':id/publish')
	@ApiSuccessMessage('FLASH_CARD_PUBLISHED')
	@ApiOperation({ summary: 'Publish flash card (admin only)' })
	@ApiParam({
		name: 'id',
		example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b',
		description: 'Flash Card State UUID',
	})
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				comment: {
					type: 'string',
					example: 'Publishing to production.',
				},
			},
		},
	})
	async publish(
		@Param('id') id: string,
		@Body('comment') comment: string,
		@CurrentUserId() userId: string,
	) {
		return this.flashCardsService.publish(id, userId, comment);
	}

	@Get(':id/transitions')
	@ApiOperation({ summary: 'Get transition history' })
	@ApiParam({
		name: 'id',
		example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b',
		description: 'Flash Card State UUID',
	})
	async getTransitionHistory(
		@Param('id') id: string,
		@Req() request: RequestWithUser,
	) {
		return this.flashCardsService.getTransitionHistory(
			id,
			request.user.id,
			request.user.role?.name === USER_ROLE.ADMIN,
		);
	}

	@Get(':id/allowed-transitions')
	@ApiOperation({ summary: 'Get allowed state transitions for current user' })
	@ApiParam({
		name: 'id',
		example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b',
		description: 'Flash Card State UUID',
	})
	async getAllowedTransitions(
		@Param('id') id: string,
		@CurrentUserId() userId: string,
	) {
		return this.flashCardsService.getAllowedTransitions(id, userId);
	}
}
