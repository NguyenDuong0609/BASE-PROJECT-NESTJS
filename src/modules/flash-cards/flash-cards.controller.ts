import {
	Controller,
	Get,
	Post,
	Body,
	Patch,
	Param,
	Delete,
	UseInterceptors,
	ClassSerializerInterceptor,
	UploadedFile,
	Req,
	UseGuards,
	Optional,
	ParseUUIDPipe,
	BadRequestException,
} from '@nestjs/common';
import { FlashCardsService } from './flash-cards.service';
import { CreateFlashCardDto } from './dto/create-flash-card.dto';
import { UpdateFlashCardDto } from './dto/update-flash-card.dto';
import {
	ApiBearerAuth,
	ApiBody,
	ApiConsumes,
	ApiOperation,
	ApiParam,
	ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { RequestWithUser } from 'src/types/requests.type';
import { JwtAccessTokenGuard } from '@modules/auth/guards/jwt-access-token.guard';
import { SwaggerArrayConversion } from 'src/interceptors/swagger-array-conversion.interceptor';
import {
	imageUploadOptions,
	validateFileSignature,
} from 'src/shared/upload-validation';
import { MediaService } from '@modules/media/services/media.service';
import { ApiSuccessMessage } from 'src/decorators/api-success-message.decorator';
import { FeatureFlag } from '../../decorators/feature-flag.decorator';
import { RequirePermissions } from '../../decorators/permissions.decorator';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { PERMISSION_CODES } from '../permissions/permissions.constants';
import { PinoLogger } from 'nestjs-pino';
import { createContextLogger } from '../../configs/logger.config';

@Controller('flash-cards')
@FeatureFlag('flashCards')
@ApiTags('flash-cards')
@ApiBearerAuth('token')
@UseGuards(JwtAccessTokenGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class FlashCardsController {
	private readonly logger: PinoLogger;

	constructor(
		private readonly flashCardsService: FlashCardsService,
		private readonly mediaService: MediaService,
		@Optional() logger?: PinoLogger,
	) {
		this.logger = createContextLogger(FlashCardsController.name, logger);
	}

	@Post()
	@UseGuards(PermissionsGuard)
	@RequirePermissions(PERMISSION_CODES.FLASH_CARDS_CREATE)
	@ApiSuccessMessage('FLASH_CARD_CREATED')
	@ApiOperation({
		summary: 'User create their new flash card',
	})
	@ApiConsumes('multipart/form-data')
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				vocabulary: {
					type: 'string',
					default: 'provision',
				},
				definition: {
					type: 'string',
					default: 'the action of providing or supplying something for use.',
				},
				meaning: {
					type: 'string',
					default: 'sự cung cấp',
				},
				pronunciation: {
					type: 'string',
					default: 'prəˈviZHən',
				},
				examples: {
					type: 'array',
					items: {
						type: 'string',
						default: '',
					},
					default: [
						'new contracts for the provision of services',
						'low levels of social provision',
						'civilian contractors were responsible for provisioning these armies',
					],
				},
				image: {
					type: 'string',
					format: 'uri',
					example: 'https://example.test/serendipity.jpg',
					description:
						'Optional image URL. Use /media/upload to upload a file.',
				},
			},
			required: ['vocabulary', 'definition', 'meaning'],
		},
	})
	@UseInterceptors(new SwaggerArrayConversion('examples'))
	@UseInterceptors(FileInterceptor('image', imageUploadOptions))
	@UseGuards(JwtAccessTokenGuard)
	async create(
		@Req() request: RequestWithUser,
		@UploadedFile() image: Express.Multer.File,
		@Body() createFlashCardDto: CreateFlashCardDto,
	) {
		if (image) validateFileSignature(image);
		if (!image && !createFlashCardDto.image) {
			throw new BadRequestException('An image file is required');
		}
		this.logger.debug(
			{ userId: request.user.id, hasImage: !!image },
			'Creating flash card',
		);
		const media = image
			? await this.mediaService.uploadFile(image, request.user.id, {
					folder: 'flash-cards',
					allowedMimetypes: ['image/jpeg', 'image/png', 'image/gif'],
				})
			: undefined;
		try {
			return await this.flashCardsService.create({
				...createFlashCardDto,
				user: request.user,
				image: media?.id || createFlashCardDto.image,
			});
		} catch (error) {
			if (media) {
				try {
					await this.mediaService.deleteFile(media.id, request.user.id);
				} catch (cleanupError) {
					this.logger.error(
						{ err: cleanupError, mediaId: media.id },
						'Failed to clean up flash-card upload',
					);
				}
			}
			throw error;
		}
	}

	@Get()
	@UseGuards(PermissionsGuard)
	@RequirePermissions(PERMISSION_CODES.FLASH_CARDS_READ)
	findAll(@Req() request: RequestWithUser) {
		return this.flashCardsService.findAllForUser(request.user);
	}

	@Get(':id')
	@UseGuards(PermissionsGuard)
	@RequirePermissions(PERMISSION_CODES.FLASH_CARDS_READ)
	@ApiParam({
		name: 'id',
		example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b',
		description: 'Flash card UUID',
	})
	findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() request: RequestWithUser,
	) {
		return this.flashCardsService.findOneForUser(id, request.user);
	}

	@Patch(':id')
	@UseGuards(PermissionsGuard)
	@RequirePermissions(PERMISSION_CODES.FLASH_CARDS_UPDATE)
	@ApiSuccessMessage('FLASH_CARD_UPDATED')
	@ApiParam({
		name: 'id',
		example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b',
		description: 'Flash card UUID',
	})
	update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateFlashCardDto: UpdateFlashCardDto,
		@Req() request: RequestWithUser,
	) {
		return this.flashCardsService.updateForUser(
			id,
			updateFlashCardDto,
			request.user,
		);
	}

	@Delete(':id')
	@UseGuards(PermissionsGuard)
	@RequirePermissions(PERMISSION_CODES.FLASH_CARDS_DELETE)
	@ApiSuccessMessage('FLASH_CARD_DELETED')
	@ApiParam({
		name: 'id',
		example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b',
		description: 'Flash card UUID',
	})
	remove(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() request: RequestWithUser,
	) {
		return this.flashCardsService.removeForUser(id, request.user);
	}
}
