import { ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { MediaFile, MediaFileStatus } from './entities/media-file.entity';
import { MediaService } from './services/media.service';
import { S3Service } from './services/s3.service';

jest.mock('@modules/queue/queue.service', () => ({
	QueueService: class QueueService {},
}));

describe('MediaService', () => {
	let service: MediaService;
	let s3: jest.Mocked<S3Service>;
	let repository: jest.Mocked<Repository<MediaFile>>;
	let queue: { addImageProcessingJob: jest.Mock };

	beforeEach(() => {
		s3 = {
			uploadFile: jest.fn().mockResolvedValue({
				key: 'random-key.jpg',
				url: 'https://storage.invalid/file',
			}),
			getBucketName: jest.fn().mockReturnValue('private-bucket'),
			getSignedDownloadUrl: jest
				.fn()
				.mockResolvedValue('https://signed.invalid'),
			deleteFile: jest.fn().mockResolvedValue(undefined),
		} as unknown as jest.Mocked<S3Service>;
		repository = {
			create: jest.fn(),
			save: jest.fn(),
			findOne: jest.fn(),
			softDelete: jest.fn(),
		} as unknown as jest.Mocked<Repository<MediaFile>>;
		queue = { addImageProcessingJob: jest.fn() };
		service = new MediaService(repository, s3, queue as never);
	});

	const jpegFile = (overrides: Partial<Express.Multer.File> = {}) =>
		({
			originalname: 'photo.jpg',
			mimetype: 'image/jpeg',
			size: 3,
			buffer: Buffer.from([0xff, 0xd8, 0xff]),
			...overrides,
		}) as Express.Multer.File;

	it('stores only safe metadata after validating the uploaded bytes', async () => {
		repository.create = jest
			.fn()
			.mockImplementation((value) => value as MediaFile);
		repository.save = jest.fn().mockImplementation(async (value) => ({
			...value,
			id: 'media-id',
			status: MediaFileStatus.COMPLETED,
		}));

		const result = await service.uploadFile(
			jpegFile({ originalname: '..\\private\\photo.jpg' }),
			'owner-id',
		);

		expect(s3.uploadFile).toHaveBeenCalledWith(
			expect.objectContaining({ mimetype: 'image/jpeg' }),
			expect.stringMatching(/^[0-9a-f-]+\.jpg$/),
		);
		expect(repository.save).toHaveBeenCalledWith(
			expect.objectContaining({
				filename: 'photo.jpg',
				uploadedBy: { id: 'owner-id' },
			}),
		);
		expect(result).toHaveProperty('id', 'media-id');
		expect(result).not.toHaveProperty('s3Key');
		expect(result).not.toHaveProperty('bucket');
	});

	it('rejects a file whose bytes do not match the claimed MIME type', async () => {
		await expect(
			service.uploadFile(
				jpegFile({ buffer: Buffer.from('not an image') }),
				'owner',
			),
		).rejects.toThrow('File content does not match an allowed type');
		expect(s3.uploadFile).not.toHaveBeenCalled();
	});

	it('cleans up storage and soft-deletes metadata if image processing enqueue fails', async () => {
		repository.create = jest
			.fn()
			.mockImplementation((value) => value as MediaFile);
		repository.save = jest.fn().mockResolvedValue({
			id: 'media-id',
			s3Key: 'random-key.jpg',
		});
		repository.softDelete = jest.fn().mockResolvedValue({ affected: 1 });
		queue.addImageProcessingJob.mockRejectedValue(
			new Error('queue unavailable'),
		);

		await expect(
			service.uploadFile(jpegFile(), 'owner-id', { processImage: true }),
		).rejects.toThrow('queue unavailable');

		expect(s3.deleteFile).toHaveBeenCalledWith(s3.uploadFile.mock.calls[0][1]);
		expect(repository.softDelete).toHaveBeenCalledWith('media-id');
	});

	it('denies metadata access to a different owner', async () => {
		repository.findOne = jest.fn().mockResolvedValue({
			id: 'media-id',
			uploadedBy: { id: 'owner-id' },
		});

		await expect(
			service.getFile('media-id', 'other-user'),
		).rejects.toBeInstanceOf(ForbiddenException);
	});

	it('requires ownership before generating a presigned download URL', async () => {
		repository.findOne = jest.fn().mockResolvedValue({
			id: 'media-id',
			s3Key: 'private-key',
			uploadedBy: { id: 'owner-id' },
		});

		await expect(
			service.getPresignedUrl('media-id', 'other-user'),
		).rejects.toBeInstanceOf(ForbiddenException);
		expect(s3.getSignedDownloadUrl).not.toHaveBeenCalled();
	});

	it('limits presigned URLs to the owner and requested expiration', async () => {
		repository.findOne = jest.fn().mockResolvedValue({
			id: 'media-id',
			s3Key: 'private-key',
			uploadedBy: { id: 'owner-id' },
		});

		await expect(
			service.getPresignedUrl('media-id', 'owner-id', false, 120),
		).resolves.toBe('https://signed.invalid');
		expect(s3.getSignedDownloadUrl).toHaveBeenCalledWith('private-key', 120);
	});

	it('allows admins to delete a file owned by someone else', async () => {
		repository.findOne = jest.fn().mockResolvedValue({
			id: 'media-id',
			s3Key: 'private-key',
			uploadedBy: { id: 'owner-id' },
		});
		repository.softDelete = jest.fn().mockResolvedValue({ affected: 1 });

		await service.deleteFile('media-id', 'admin-id', true);

		expect(s3.deleteFile).toHaveBeenCalledWith('private-key');
		expect(repository.softDelete).toHaveBeenCalledWith('media-id');
	});
});
