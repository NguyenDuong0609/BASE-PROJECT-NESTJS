import {
	Controller,
	Post,
	Get,
	Delete,
	Param,
	UseInterceptors,
	UploadedFile,
	UseGuards,
	Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
	ApiTags,
	ApiOperation,
	ApiConsumes,
	ApiBody,
	ApiBearerAuth,
	ApiParam,
} from '@nestjs/swagger';
import { MediaService } from './services/media.service';
import { CurrentUserId } from 'src/decorators/current-user.decorator';
import { JwtAccessTokenGuard } from '@modules/auth/guards/jwt-access-token.guard';
import { RequestWithUser } from 'src/types/requests.type';
import { USER_ROLE } from '@modules/user-roles/entities/user-role.entity';
import { singleFileUploadOptions } from 'src/shared/upload-validation';
import { ApiSuccessMessage } from 'src/decorators/api-success-message.decorator';

@ApiTags('Media')
@ApiBearerAuth('token')
@UseGuards(JwtAccessTokenGuard)
@Controller('media')
export class MediaController {
	constructor(private readonly mediaService: MediaService) {}

	@Post('upload')
	@ApiSuccessMessage('MEDIA_UPLOADED')
	@ApiOperation({ summary: 'Upload a file to S3' })
	@ApiConsumes('multipart/form-data')
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				file: {
					type: 'string',
					format: 'binary',
				},
			},
		},
	})
	@UseInterceptors(FileInterceptor('file', singleFileUploadOptions))
	async uploadFile(
		@UploadedFile() file: Express.Multer.File,
		@CurrentUserId() userId: string,
	) {
		return this.mediaService.uploadFile(file, userId);
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get file metadata' })
	@ApiParam({
		name: 'id',
		example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b',
		description: 'Media file UUID',
	})
	async getFile(@Param('id') id: string, @Req() request: RequestWithUser) {
		return this.mediaService.getFile(
			id,
			request.user.id,
			request.user.role?.name === USER_ROLE.ADMIN,
		);
	}

	@Get(':id/download')
	@ApiOperation({ summary: 'Get presigned download URL' })
	@ApiParam({
		name: 'id',
		example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b',
		description: 'Media file UUID',
	})
	async getDownloadUrl(
		@Param('id') id: string,
		@Req() request: RequestWithUser,
	) {
		const url = await this.mediaService.getPresignedUrl(
			id,
			request.user.id,
			request.user.role?.name === USER_ROLE.ADMIN,
		);
		return { url };
	}

	@Delete(':id')
	@ApiSuccessMessage('MEDIA_DELETED')
	@ApiOperation({ summary: 'Delete a file' })
	@ApiParam({
		name: 'id',
		example: 'c3f68744-8d48-43bf-939e-4e6ad9d7e35b',
		description: 'Media file UUID',
	})
	async deleteFile(
		@Param('id') id: string,
		@CurrentUserId() userId: string,
		@Req() request: RequestWithUser,
	) {
		await this.mediaService.deleteFile(
			id,
			userId,
			request.user.role?.name === USER_ROLE.ADMIN,
		);
		return { message: 'File deleted successfully' };
	}
}
