import {
	Injectable,
	NotFoundException,
	ForbiddenException,
	BadRequestException,
	Optional,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaFile, MediaFileStatus } from '../entities/media-file.entity';
import { S3Service } from './s3.service';
import { QueueService } from '@modules/queue/queue.service';
import { createContextLogger } from '../../../configs/logger.config';
import { ImageOperation } from '@modules/queue/interfaces/job-data.interface';
import { randomUUID } from 'crypto';
import { validateFileSignature } from 'src/shared/upload-validation';

interface UploadOptions {
	folder?: string;
	metadata?: Record<string, any>;
	processImage?: boolean;
	imageOperations?: ImageOperation[];
	outputFormats?: string[];
	maxSize?: number;
	allowedMimetypes?: string[];
}

type SafeMediaFile = Pick<
	MediaFile,
	'id' | 'filename' | 'mimetype' | 'size' | 'status' | 'uploadedAt'
>;

@Injectable()
export class MediaService {
	private readonly logger: PinoLogger;

	constructor(
		@InjectRepository(MediaFile)
		private readonly mediaRepository: Repository<MediaFile>,
		private readonly s3Service: S3Service,
		private readonly queueService: QueueService,
		@Optional() logger?: PinoLogger,
	) {
		this.logger = createContextLogger(MediaService.name, logger);
	}

	async uploadFile(
		file: Express.Multer.File,
		userId: string,
		options?: UploadOptions,
	): Promise<SafeMediaFile> {
		this.validateFile(file, options);
		validateFileSignature(file);
		const s3Key = this.generateS3Key(file, options?.folder);
		let objectUploaded = false;
		let savedMediaFile: MediaFile | undefined;

		try {
			const uploadResult = await this.s3Service.uploadFile(file, s3Key);
			objectUploaded = true;

			const mediaFile = this.mediaRepository.create({
				filename: this.safeFilename(file.originalname),
				s3Key: uploadResult.key,
				mimetype: file.mimetype,
				size: file.size,
				bucket: this.s3Service.getBucketName(),
				url: uploadResult.url,
				status: MediaFileStatus.COMPLETED,
				uploadedBy: { id: userId } as any,
				metadata: options?.metadata || {},
			});

			savedMediaFile = await this.mediaRepository.save(mediaFile);

			if (this.isImage(file.mimetype) && options?.processImage) {
				await this.queueService.addImageProcessingJob({
					fileKey: s3Key,
					operations: options.imageOperations || [ImageOperation.COMPRESS],
					outputFormats: options.outputFormats || ['webp'],
				});
			}

			this.logger.info(
				{ mediaFileId: savedMediaFile.id, userId },
				'File uploaded successfully',
			);
			return this.toSafeResponse(savedMediaFile);
		} catch (error) {
			this.logger.error({ err: error, userId }, 'File upload failed');
			if (savedMediaFile?.id) {
				try {
					await this.mediaRepository.softDelete(savedMediaFile.id);
				} catch (cleanupError) {
					this.logger.error(
						{ err: cleanupError, mediaFileId: savedMediaFile.id },
						'Failed to clean up media metadata after upload failure',
					);
				}
			}
			if (objectUploaded) {
				try {
					await this.s3Service.deleteFile(s3Key);
				} catch (cleanupError) {
					this.logger.error(
						{ err: cleanupError, objectKey: s3Key },
						'Failed to clean up orphaned object storage file',
					);
				}
			}
			throw error;
		}
	}

	async getFile(
		id: string,
		userId: string,
		isAdmin = false,
	): Promise<SafeMediaFile> {
		const file = await this.findFile(id);
		this.assertOwner(file, userId, isAdmin);
		return this.toSafeResponse(file);
	}

	private async findFile(id: string): Promise<MediaFile> {
		const file = await this.mediaRepository.findOne({
			where: { id },
			relations: ['uploadedBy'],
		});

		if (!file) {
			throw new NotFoundException(`File not found: ${id}`);
		}

		return file;
	}

	async getPresignedUrl(
		id: string,
		userId: string,
		isAdmin = false,
		expiresIn = 900,
	): Promise<string> {
		const file = await this.findFile(id);
		this.assertOwner(file, userId, isAdmin);
		return this.s3Service.getSignedDownloadUrl(file.s3Key, expiresIn);
	}

	async deleteFile(id: string, userId: string, isAdmin = false): Promise<void> {
		const file = await this.findFile(id);
		this.assertOwner(file, userId, isAdmin);

		try {
			await this.s3Service.deleteFile(file.s3Key);
			await this.mediaRepository.softDelete(id);
			this.logger.info(
				{ mediaFileId: id, userId },
				'File deleted successfully',
			);
		} catch (error) {
			this.logger.error(
				{ err: error, mediaFileId: id, userId },
				'File deletion failed',
			);
			throw error;
		}
	}

	private validateFile(
		file: Express.Multer.File,
		options?: UploadOptions,
	): void {
		if (!file) {
			throw new BadRequestException('File is required');
		}

		const maxSize = options?.maxSize || 10 * 1024 * 1024;

		if (file.size > maxSize) {
			throw new BadRequestException(
				`File size exceeds maximum allowed: ${maxSize} bytes`,
			);
		}

		if (options?.allowedMimetypes) {
			if (!options.allowedMimetypes.includes(file.mimetype)) {
				throw new BadRequestException(
					`File type not allowed. Allowed types: ${options.allowedMimetypes.join(
						', ',
					)}`,
				);
			}
		}
	}

	private assertOwner(file: MediaFile, userId: string, isAdmin: boolean): void {
		if (file.uploadedBy.id !== userId && !isAdmin) {
			throw new ForbiddenException(
				'You do not have permission to access this file',
			);
		}
	}

	private toSafeResponse(file: MediaFile): SafeMediaFile {
		return {
			id: file.id,
			filename: file.filename,
			mimetype: file.mimetype,
			size: file.size,
			status: file.status,
			uploadedAt: file.uploadedAt,
		};
	}

	private safeFilename(filename: string): string {
		const basename = filename
			.split(/[\\/]/)
			.pop()
			?.replace(/[\u0000-\u001f\u007f]/g, '')
			.trim()
			.slice(0, 255);
		return basename || 'upload';
	}

	private generateS3Key(file: Express.Multer.File, folder?: string): string {
		const extensions: Record<string, string> = {
			'image/jpeg': 'jpg',
			'image/png': 'png',
			'image/gif': 'gif',
			'application/pdf': 'pdf',
		};
		const basePath = folder ? `${folder.replace(/[^a-zA-Z0-9/_-]/g, '')}/` : '';
		return `${basePath}${randomUUID()}.${extensions[file.mimetype]}`;
	}

	private isImage(mimetype: string): boolean {
		return mimetype.startsWith('image/');
	}
}
