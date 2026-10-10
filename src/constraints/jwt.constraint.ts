import * as crypto from 'node:crypto';
import * as path from 'node:path';
import * as fs from 'fs';

/**
 * JWT Key Management
 *
 * Production: Keys are provided via environment variables:
 *   - JWT_ACCESS_TOKEN_PRIVATE_KEY (base64 encoded PEM)
 *   - JWT_ACCESS_TOKEN_PUBLIC_KEY  (base64 encoded PEM)
 *   - JWT_REFRESH_TOKEN_PRIVATE_KEY (base64 encoded PEM)
 *   - JWT_REFRESH_TOKEN_PUBLIC_KEY  (base64 encoded PEM)
 *
 * Development: If env vars are not set, keys are auto-generated
 *   and stored in the /secure directory (gitignored).
 *
 * Generate keys manually:
 *   openssl genrsa -out private.pem 2048
 *   openssl rsa -in private.pem -pubout -out public.pem
 *   # Base64 encode for env:
 *   cat private.pem | base64 -w 0
 */

function checkExistFolder(name: string) {
	const check_path = path.join(__dirname, `../../${name}`);
	if (!fs.existsSync(check_path)) {
		fs.mkdirSync(check_path, { recursive: true });
	}
}

function getKeyPairFromEnvOrFile(
	envPrivateKey: string,
	envPublicKey: string,
	privateKeyFilename: string,
	publicKeyFilename: string,
): { privateKey: string; publicKey: string } {
	// 1. Try environment variables first (production)
	const envPrivate = process.env[envPrivateKey];
	const envPublic = process.env[envPublicKey];

	if (envPrivate && envPublic) {
		return {
			privateKey: Buffer.from(envPrivate, 'base64').toString('utf-8'),
			publicKey: Buffer.from(envPublic, 'base64').toString('utf-8'),
		};
	}

	// 2. Fallback: file-based keys (development)
	checkExistFolder('secure');
	const privateKeyPath = path.join(
		__dirname,
		`../../secure/${privateKeyFilename}`,
	);
	const publicKeyPath = path.join(
		__dirname,
		`../../secure/${publicKeyFilename}`,
	);

	if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
		const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
			modulusLength: 2048,
			publicKeyEncoding: {
				type: 'spki',
				format: 'pem',
			},
			privateKeyEncoding: {
				type: 'pkcs8',
				format: 'pem',
			},
		});

		fs.writeFileSync(privateKeyPath, privateKey);
		fs.writeFileSync(publicKeyPath, publicKey);
	}

	return {
		privateKey: fs.readFileSync(privateKeyPath, 'utf-8'),
		publicKey: fs.readFileSync(publicKeyPath, 'utf-8'),
	};
}

const accessTokenKeyPair = getKeyPairFromEnvOrFile(
	'JWT_ACCESS_TOKEN_PRIVATE_KEY',
	'JWT_ACCESS_TOKEN_PUBLIC_KEY',
	'access_token_private.key',
	'access_token_public.key',
);

const refreshTokenKeyPair = getKeyPairFromEnvOrFile(
	'JWT_REFRESH_TOKEN_PRIVATE_KEY',
	'JWT_REFRESH_TOKEN_PUBLIC_KEY',
	'refresh_token_private.key',
	'refresh_token_public.key',
);

export const access_token_private_key = accessTokenKeyPair.privateKey;
export const access_token_public_key = accessTokenKeyPair.publicKey;

export const refresh_token_private_key = refreshTokenKeyPair.privateKey;
export const refresh_token_public_key = refreshTokenKeyPair.publicKey;
