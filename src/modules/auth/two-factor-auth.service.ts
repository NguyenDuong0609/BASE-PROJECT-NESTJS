import { Injectable } from '@nestjs/common';
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import * as qrcode from 'qrcode';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';

@Injectable()
export class TwoFactorAuthService {
	private readonly totp: TOTP;

	constructor(
		private readonly usersService: UsersService,
		private readonly configService: ConfigService,
	) {
		this.totp = new TOTP({
			crypto: new NobleCryptoPlugin(),
			base32: new ScureBase32Plugin(),
			period: 30,
			digits: 6,
		});
	}

	public async generateTwoFactorAuthenticationSecret(user: User) {
		if (user.isTwoFactorAuthenticationEnabled) {
			throw new UnauthorizedException(
				'Two-factor authentication is already enabled',
			);
		}
		const secret = this.totp.generateSecret();
		const appName = this.configService.get('APP_NAME') || 'NestJS_Boilerplate';
		// Construct otpauth URL manually as generateURI is not available in newer otplib versions
		const otpauthUrl = `otpauth://totp/${encodeURIComponent(
			appName,
		)}:${encodeURIComponent(
			user.email,
		)}?secret=${secret}&issuer=${encodeURIComponent(appName)}`;

		await this.usersService.update(user.id, {
			twoFactorAuthenticationSecret: this.encryptSecret(secret),
		});

		return {
			secret,
			otpauthUrl,
		};
	}

	public async pipeQrCodeStream(stream: Response, otpauthUrl: string) {
		return qrcode.toFileStream(stream, otpauthUrl);
	}

	public async getQrCodeDataUrl(otpauthUrl: string) {
		return qrcode.toDataURL(otpauthUrl);
	}

	public async isTwoFactorAuthenticationCodeValid(
		twoFactorAuthenticationCode: string,
		user: User,
	): Promise<boolean> {
		return (
			(await this.getValidCounter(twoFactorAuthenticationCode, user)) !== null
		);
	}

	private async getValidCounter(
		twoFactorAuthenticationCode: string,
		user: User,
	): Promise<number | null> {
		if (!user.twoFactorAuthenticationSecret) {
			return null;
		}
		try {
			const result = await this.totp.verify(twoFactorAuthenticationCode, {
				secret: this.decryptSecret(user.twoFactorAuthenticationSecret),
			});
			return result.valid ? result.timeStep : null;
		} catch {
			return null;
		}
	}

	public async verifyUserCode(userId: string, code: string): Promise<boolean> {
		const user = await this.usersService.findOne(userId);
		const counter = await this.getValidCounter(code, user);
		return counter !== null
			? this.usersService.consumeTwoFactorCounter(userId, counter)
			: false;
	}

	public async turnOnTwoFactorAuthentication(
		userId: string,
		code: string,
	): Promise<void> {
		if (!(await this.verifyUserCode(userId, code))) {
			throw new UnauthorizedException('Invalid two-factor code');
		}
		await this.usersService.update(userId, {
			isTwoFactorAuthenticationEnabled: true,
		});
	}

	public async turnOffTwoFactorAuthentication(
		userId: string,
		code: string,
	): Promise<void> {
		if (!(await this.verifyUserCode(userId, code))) {
			throw new UnauthorizedException('Invalid two-factor code');
		}
		await this.usersService.update(userId, {
			isTwoFactorAuthenticationEnabled: false,
			twoFactorAuthenticationSecret: null,
		});
	}

	private encryptSecret(secret: string): string {
		const key = Buffer.from(
			this.configService.getOrThrow<string>('twoFactor.encryptionKey'),
			'hex',
		);
		const iv = randomBytes(12);
		const cipher = createCipheriv('aes-256-gcm', key, iv);
		const encrypted = Buffer.concat([
			cipher.update(secret, 'utf8'),
			cipher.final(),
		]);
		return `v1:${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
	}

	private decryptSecret(value: string): string {
		const [version, ivHex, tagHex, encryptedHex] = value.split(':');
		if (version !== 'v1' || !ivHex || !tagHex || !encryptedHex) {
			throw new Error('Stored two-factor secret has an unsupported format');
		}
		const key = Buffer.from(
			this.configService.getOrThrow<string>('twoFactor.encryptionKey'),
			'hex',
		);
		const decipher = createDecipheriv(
			'aes-256-gcm',
			key,
			Buffer.from(ivHex, 'hex'),
		);
		decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
		return Buffer.concat([
			decipher.update(Buffer.from(encryptedHex, 'hex')),
			decipher.final(),
		]).toString('utf8');
	}
}
