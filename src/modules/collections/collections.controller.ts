import {
	Controller,
	Get,
	Post,
	Body,
	Patch,
	Param,
	Delete,
	UploadedFile,
	UseGuards,
	Req,
	Query,
	Optional,
	ParseUUIDPipe,
	UseInterceptors,
	ClassSerializerInterceptor,
	BadRequestException,
} from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import {
	ApiBearerAuth,
	ApiOperation,
	ApiParam,
	ApiQuery,
	ApiTags,
} from '@nestjs/swagger';
import { COLLECTION_LEVEL } from './entities/collection.entity';
import { JwtAccessTokenGuard } from '@modules/auth/guards/jwt-access-token.guard';
import { RequestWithUser } from 'src/types/requests.type';
import {
	ApiBodyWithSingleFile,
	ApiDocsPagination,
} from 'src/decorators/swagger-form-data.decorator';
import {
	imageUploadOptions,
	validateFileSignature,
} from 'src/shared/upload-validation';
import { MediaService } from '@modules/media/services/media.service';
import { ApiSuccessMessage } from 'src/decorators/api-success-message.decorator';
import { FeatureFlag } from '../../decorators/feature-flag.decorator';
import { ParsePaginationPipe } from '@modules/shared/base/pipes/parse-pagination.pipe';
import { PinoLogger } from 'nestjs-pino';
import { createContextLogger } from '../../configs/logger.config';

@Controller('collections')
@FeatureFlag('collections')
@ApiTags('collections')
@ApiBearerAuth('token')
@UseGuards(JwtAccessTokenGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class CollectionsController {
	private readonly logger: PinoLogger;

	constructor(
		private readonly collectionsService: CollectionsService,
		private readonly mediaService: MediaService,
		@Optional() logger?: PinoLogger,
	) {
		this.logger = createContextLogger(CollectionsController.name, logger);
	}

	@Post()
	@ApiSuccessMessage('COLLECTION_CREATED')
	@ApiOperation({
		summary: 'User create their collection',
	})
	@ApiBodyWithSingleFile(
		'image',
		{
			name: {
				type: 'string',
				default: 'Learn Kitchen Vocabulary',
			},
			description: { type: 'string', default: 'Some description' },
			level: {
				type: 'string',
				enum: Object.values(COLLECTION_LEVEL),
				default: COLLECTION_LEVEL.CHAOS,
			},
			is_public: {
				type: 'boolean',
				default: true,
			},
			image: {
				type: 'string',
				format: 'binary',
			},
		},
		['name', 'level'],
		imageUploadOptions,
	)
	async create(
		@Req() request: RequestWithUser,
		@UploadedFile() image: Express.Multer.File,
		@Body() createCollectionDto: CreateCollectionDto,
	) {
		if (image) validateFileSignature(image);
		this.logger.debug(
			{ hasImage: !!image, fileSize: image?.size, mimeType: image?.mimetype },
			'Creating collection',
		);
		const media = image
			? await this.mediaService.uploadFile(image, request.user.id, {
					folder: 'collections',
					allowedMimetypes: ['image/jpeg', 'image/png', 'image/gif'],
				})
			: undefined;
		try {
			return await this.collectionsService.create({
				...createCollectionDto,
				user: request.user,
				image: media?.id || createCollectionDto.image,
			});
		} catch (error) {
			if (media) {
				try {
					await this.mediaService.deleteFile(media.id, request.user.id);
				} catch (cleanupError) {
					this.logger.error(
						{ err: cleanupError, mediaId: media.id },
						'Failed to clean up collection upload',
					);
				}
			}
			throw error;
		}
	}

	@Get()
	@ApiDocsPagination('collection')
	@ApiQuery({
		name: 'level',
		type: 'array',
		examples: {
			one_level_type: {
				value: [COLLECTION_LEVEL.HARD],
			},
			two_level_type: {
				value: [COLLECTION_LEVEL.EASY, COLLECTION_LEVEL.MEDIUM],
			},
		},
		required: false,
	})
	findAll(
		@Query(
			'offset',
			new ParsePaginationPipe({
				defaultValue: 0,
				minimum: 0,
				maximum: 1_000_000,
			}),
		)
		offset: number,
		@Query(
			'limit',
			new ParsePaginationPipe({ defaultValue: 20, minimum: 1, maximum: 100 }),
		)
		limit: number,
		@Req() request: RequestWithUser,
		@Query('level') level?: string | string[],
	) {
		const levels = level
			? (Array.isArray(level) ? level : [level])
					.flatMap((value) => value.split(','))
					.map((value) => value.trim())
			: [];
		if (
			levels.some(
				(value) =>
					!Object.values(COLLECTION_LEVEL).includes(value as COLLECTION_LEVEL),
			)
		) {
			throw new BadRequestException('Invalid collection level filter');
		}
		this.logger.debug(
			{ offset, limit, level: levels.length ? levels : 'all' },
			'Fetching collections with filters',
		);
		return this.collectionsService.findAllForUser(
			request.user,
			offset,
			Math.min(limit, 100),
			levels as COLLECTION_LEVEL[],
		);
	}

	@Get(':id')
	@ApiParam({
		name: 'id',
		type: 'string',
		examples: {
			migration_id_1: {
				value: '644293b09150e9f67d9bb75d',
				description: `Collection Kitchen vocabulary`,
			},
			migration_id_2: {
				value: '6442941027467f9a755ff76d',
				description: `Collection Sport vocabulary`,
			},
		},
	})
	findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() request: RequestWithUser,
	) {
		return this.collectionsService.findOneForUser(id, request.user);
	}

	@Patch(':id')
	@ApiSuccessMessage('COLLECTION_UPDATED')
	@ApiParam({
		name: 'id',
		type: 'string',
		example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b',
		description: 'Collection ID/UUID',
	})
	update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateCollectionDto: UpdateCollectionDto,
		@Req() request: RequestWithUser,
	) {
		return this.collectionsService.updateForUser(
			id,
			updateCollectionDto,
			request.user,
		);
	}

	@Delete(':id')
	@ApiSuccessMessage('COLLECTION_DELETED')
	@ApiParam({
		name: 'id',
		type: 'string',
		example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b',
		description: 'Collection ID/UUID',
	})
	remove(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() request: RequestWithUser,
	) {
		return this.collectionsService.removeForUser(id, request.user);
	}
}
