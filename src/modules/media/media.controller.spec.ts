import { MediaController } from './media.controller';
import { MediaService } from './services/media.service';
import { USER_ROLE } from '@modules/user-roles/entities/user-role.entity';

jest.mock('@modules/queue/queue.service', () => ({
	QueueService: class QueueService {},
}));

describe('MediaController', () => {
	let controller: MediaController;
	let service: jest.Mocked<MediaService>;

	beforeEach(() => {
		service = {
			uploadFile: jest.fn(),
			getFile: jest.fn(),
			getPresignedUrl: jest.fn(),
			deleteFile: jest.fn(),
		} as unknown as jest.Mocked<MediaService>;
		controller = new MediaController(service);
	});

	it('uploads a file for the authenticated user', async () => {
		const file = {
			originalname: 'test.jpg',
			mimetype: 'image/jpeg',
			size: 3,
			buffer: Buffer.from([0xff, 0xd8, 0xff]),
		} as Express.Multer.File;
		service.uploadFile.mockResolvedValue({ id: 'media-id' } as never);

		await expect(controller.uploadFile(file, 'user-id')).resolves.toEqual({
			id: 'media-id',
		});
		expect(service.uploadFile).toHaveBeenCalledWith(file, 'user-id');
	});

	it('includes admin status when requesting file metadata', async () => {
		const request = {
			user: { id: 'admin-id', role: { name: USER_ROLE.ADMIN } },
		} as never;
		service.getFile.mockResolvedValue({ id: 'media-id' } as never);

		await controller.getFile('media-id', request);

		expect(service.getFile).toHaveBeenCalledWith('media-id', 'admin-id', true);
	});

	it('returns a presigned URL as a URL property', async () => {
		service.getPresignedUrl.mockResolvedValue('https://signed.invalid');

		await expect(
			controller.getDownloadUrl('media-id', {
				user: { id: 'user-id', role: { name: USER_ROLE.USER } },
			} as never),
		).resolves.toEqual({ url: 'https://signed.invalid' });
		expect(service.getPresignedUrl).toHaveBeenCalledWith(
			'media-id',
			'user-id',
			false,
		);
	});
});
