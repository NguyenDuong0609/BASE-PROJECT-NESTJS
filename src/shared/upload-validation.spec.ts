import { BadRequestException } from '@nestjs/common';
import {
	imageUploadOptions,
	multipleImageUploadOptions,
	singleFileUploadOptions,
	validateFileSignature,
} from './upload-validation';

describe('upload validation', () => {
	it('limits single and multiple uploads at the Multer layer', () => {
		expect(singleFileUploadOptions.limits).toMatchObject({
			files: 1,
			fileSize: expect.any(Number),
		});
		expect(multipleImageUploadOptions.limits).toMatchObject({
			files: 5,
			fileSize: expect.any(Number),
		});
	});

	it('rejects non-image MIME types from image upload endpoints', () => {
		const callback = jest.fn();
		imageUploadOptions.fileFilter(
			{} as never,
			{ mimetype: 'text/html' } as Express.Multer.File,
			callback,
		);

		expect(callback).toHaveBeenCalledWith(
			expect.any(BadRequestException),
			false,
		);
	});

	it('accepts a JPEG only when its bytes match the claimed MIME type', () => {
		expect(() =>
			validateFileSignature({
				mimetype: 'image/jpeg',
				buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
			} as Express.Multer.File),
		).not.toThrow();

		expect(() =>
			validateFileSignature({
				mimetype: 'image/jpeg',
				buffer: Buffer.from('not a jpeg'),
			} as Express.Multer.File),
		).toThrow(BadRequestException);
	});

	it('rejects missing file content', () => {
		expect(() =>
			validateFileSignature({
				mimetype: 'image/png',
				buffer: Buffer.alloc(0),
			} as Express.Multer.File),
		).toThrow('File content is required');
	});
});
