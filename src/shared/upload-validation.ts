import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export const MAX_UPLOAD_SIZE =
	Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;
export const ALLOWED_UPLOAD_MIME_TYPES = (
	process.env.ALLOWED_FILE_TYPES ||
	'image/jpeg,image/png,image/gif,application/pdf'
)
	.split(',')
	.map((type) => type.trim())
	.filter(Boolean);

export const singleFileUploadOptions: MulterOptions = {
	limits: { fileSize: MAX_UPLOAD_SIZE, files: 1, fields: 20, parts: 22 },
	fileFilter: (_request, file, callback) => {
		if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.mimetype)) {
			callback(new BadRequestException('File type is not allowed'), false);
			return;
		}
		callback(null, true);
	},
};

export const imageUploadOptions: MulterOptions = {
	limits: { fileSize: MAX_UPLOAD_SIZE, files: 1, fields: 20, parts: 22 },
	fileFilter: (_request, file, callback) => {
		if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.mimetype)) {
			callback(
				new BadRequestException('Only JPEG, PNG, and GIF images are allowed'),
				false,
			);
			return;
		}
		callback(null, true);
	},
};

export const multipleImageUploadOptions: MulterOptions = {
	limits: { fileSize: MAX_UPLOAD_SIZE, files: 5, fields: 20, parts: 25 },
	fileFilter: (_request, file, callback) => {
		if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.mimetype)) {
			callback(
				new BadRequestException('Only JPEG, PNG, and GIF images are allowed'),
				false,
			);
			return;
		}
		callback(null, true);
	},
};

export function validateFileSignature(file: Express.Multer.File): void {
	if (!file?.buffer?.length) {
		throw new BadRequestException('File content is required');
	}

	const bytes = file.buffer;
	const matches: Record<string, boolean> = {
		'image/png':
			bytes.length >= 8 &&
			bytes
				.subarray(0, 8)
				.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
		'image/jpeg':
			bytes.length >= 3 &&
			bytes[0] === 0xff &&
			bytes[1] === 0xd8 &&
			bytes[2] === 0xff,
		'image/gif':
			bytes.length >= 6 &&
			['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString('ascii')),
		'application/pdf': bytes.subarray(0, 5).toString('ascii') === '%PDF-',
	};

	if (
		!ALLOWED_UPLOAD_MIME_TYPES.includes(file.mimetype) ||
		!matches[file.mimetype]
	) {
		throw new BadRequestException(
			'File content does not match an allowed type',
		);
	}
}
