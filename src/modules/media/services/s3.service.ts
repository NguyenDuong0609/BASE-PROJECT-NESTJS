import {
	Injectable,
	Optional,
	ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { createContextLogger } from '../../../configs/logger.config';
import {
	S3Client,
	PutObjectCommand,
	GetObjectCommand,
	DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
	private readonly logger: PinoLogger;
	private readonly s3Client: S3Client;
	private readonly bucketName: string;
	private readonly region: string;

	constructor(
		private readonly configService: ConfigService,
		@Optional() logger?: PinoLogger,
	) {
		this.logger = createContextLogger(S3Service.name, logger);
		const region = this.configService.get<string>('aws.region');
		this.region = region || 'us-east-1';
		const accessKeyId = this.configService.get<string>('aws.accessKeyId');
		const secretAccessKey = this.configService.get<string>(
			'aws.secretAccessKey',
		);

		this.s3Client = new S3Client({
			region: this.region,
			...(accessKeyId && secretAccessKey
				? { credentials: { accessKeyId, secretAccessKey } }
				: {}),
		});

		this.bucketName = this.configService.get<string>('aws.s3.bucket');
	}

	getBucketName(): string {
		if (!this.configService.get<boolean>('features.s3') || !this.bucketName) {
			throw new ServiceUnavailableException('S3 storage is not configured');
		}
		return this.bucketName;
	}

	async uploadFile(
		file: Express.Multer.File,
		key: string,
	): Promise<{ key: string; url: string }> {
		const bucket = this.getBucketName();
		try {
			const command = new PutObjectCommand({
				Bucket: bucket,
				Key: key,
				Body: file.buffer,
				ContentType: file.mimetype,
			});

			await this.s3Client.send(command);

			this.logger.info({ objectKey: key }, 'File uploaded successfully');

			const url = `https://${bucket}.s3.${
				this.region
			}.amazonaws.com/${encodeURIComponent(key)}`;

			return {
				key,
				url,
			};
		} catch (error) {
			this.logger.error({ err: error, objectKey: key }, 'S3 upload failed');
			throw new ServiceUnavailableException('Object storage upload failed');
		}
	}

	async getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
		const bucket = this.getBucketName();
		if (!Number.isInteger(expiresIn) || expiresIn < 1 || expiresIn > 3600) {
			throw new RangeError(
				'Presigned URL expiry must be between 1 and 3600 seconds',
			);
		}
		try {
			const command = new GetObjectCommand({
				Bucket: bucket,
				Key: key,
			});

			const url = await getSignedUrl(this.s3Client, command, { expiresIn });
			return url;
		} catch (error) {
			this.logger.error(
				{ err: error, objectKey: key },
				'Failed to generate S3 presigned URL',
			);
			throw new ServiceUnavailableException('Could not create download URL');
		}
	}

	async deleteFile(key: string): Promise<void> {
		const bucket = this.getBucketName();
		try {
			const command = new DeleteObjectCommand({
				Bucket: bucket,
				Key: key,
			});

			await this.s3Client.send(command);
			this.logger.info({ objectKey: key }, 'File deleted successfully');
		} catch (error) {
			this.logger.error({ err: error, objectKey: key }, 'S3 delete failed');
			throw new ServiceUnavailableException('Object storage delete failed');
		}
	}
}
