import { User } from '@modules/users/entities/user.entity';
import { UsersService } from '@modules/users/users.service';
import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
	UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenPayload } from './interfaces/token.interface';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { SignUpDto } from './dto/sign-up.dto';
import { createHmac, timingSafeEqual } from 'crypto';
import { normalizeEmail } from '../../shared/normalize-email';

@Injectable()
export class AuthService {
	constructor(
		private config_service: ConfigService,
		private readonly users_service: UsersService,
		private readonly jwt_service: JwtService,
	) {}

	async signUp(sign_up_dto: SignUpDto) {
		const email = normalizeEmail(sign_up_dto.email);
		const existed_user = await this.users_service.findOneByCondition({
			email,
		});
		if (existed_user) {
			throw new ConflictException('Email already existed!!');
		}
		const user = await this.users_service.create({
			...sign_up_dto,
			email,
			username: `${sign_up_dto.email.split('@')[0]}${Math.floor(
				10 + Math.random() * (999 - 10),
			)}`,
		});
		const refresh_token = this.generateRefreshToken({
			user_id: user.id,
		});
		await this.storeRefreshToken(user.id, refresh_token);
		return {
			access_token: this.generateAccessToken({
				user_id: user.id,
			}),
			refresh_token,
		};
	}

	async signIn(user_id: string) {
		const access_token = this.generateAccessToken({ user_id });
		const refresh_token = this.generateRefreshToken({ user_id });
		await this.storeRefreshToken(user_id, refresh_token);
		return { access_token, refresh_token };
	}

	async getAuthenticatedUser(email: string, password: string): Promise<User> {
		let user: User;
		try {
			user = await this.users_service.getUserByEmail(normalizeEmail(email));
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw new UnauthorizedException('Wrong credentials');
			}
			throw error;
		}
		if (!user?.password || !(await bcrypt.compare(password, user.password))) {
			throw new UnauthorizedException('Wrong credentials');
		}
		if (
			this.config_service.get<boolean>('auth.requireVerifiedEmail') &&
			!user.isEmailVerified
		) {
			throw new UnauthorizedException('Email verification is required');
		}
		return user;
	}

	async verifyPassword(userId: string, password: string): Promise<boolean> {
		const user = await this.users_service.findOneByCondition({
			id: userId,
		});
		return Boolean(
			user?.password && (await bcrypt.compare(password, user.password)),
		);
	}

	issueTwoFactorChallenge(userId: string): string {
		return this.jwt_service.sign(
			{ user_id: userId, purpose: 'two_factor_challenge' },
			{
				algorithm: 'HS256',
				secret: this.twoFactorChallengeSecret(),
				expiresIn: 300,
			},
		);
	}

	verifyTwoFactorChallenge(token: string): string {
		try {
			const payload = this.jwt_service.verify<
				TokenPayload & { purpose?: string }
			>(token, {
				secret: this.twoFactorChallengeSecret(),
				algorithms: ['HS256'],
			});
			if (payload.purpose !== 'two_factor_challenge' || !payload.user_id) {
				throw new UnauthorizedException('Invalid two-factor challenge');
			}
			return payload.user_id;
		} catch {
			throw new UnauthorizedException(
				'Invalid or expired two-factor challenge',
			);
		}
	}

	private async verifyPlainContentWithHashedContent(
		plain_text: string,
		hashed_text: string,
	) {
		const is_matching = await bcrypt.compare(plain_text, hashed_text);
		if (!is_matching) {
			throw new BadRequestException();
		}
	}

	async getUserIfRefreshTokenMatched(
		user_id: string,
		refresh_token: string,
	): Promise<User> {
		const user = await this.users_service.findOneByCondition({
			id: user_id,
		});
		if (!user) {
			throw new UnauthorizedException();
		}
		if (!user.current_refresh_token) {
			throw new UnauthorizedException('Invalid refresh token');
		}
		const expectedHash = this.hashRefreshToken(refresh_token);
		const storedHash = Buffer.from(user.current_refresh_token, 'hex');
		const candidateHash = Buffer.from(expectedHash, 'hex');
		if (
			storedHash.length !== candidateHash.length ||
			!timingSafeEqual(storedHash, candidateHash) ||
			!(await this.users_service.consumeCurrentRefreshToken(
				user.id,
				user.current_refresh_token,
			))
		) {
			throw new UnauthorizedException('Invalid or already-used refresh token');
		}
		return user;
	}

	generateAccessToken(payload: TokenPayload) {
		return this.jwt_service.sign(payload, {
			algorithm: 'HS256',
			secret: this.config_service.getOrThrow<string>('jwt.accessTokenSecret'),
			expiresIn: this.getAccessTokenExpirationSeconds(),
		});
	}

	generateRefreshToken(payload: TokenPayload) {
		return this.jwt_service.sign(payload, {
			algorithm: 'HS256',
			secret: this.config_service.getOrThrow<string>('jwt.refreshTokenSecret'),
			expiresIn: this.getRefreshTokenExpirationSeconds(),
		});
	}

	getAccessTokenExpirationSeconds(): number {
		const expiresIn =
			this.config_service.get<string>('jwt.accessTokenExpiration') ||
			this.config_service.get<string>('JWT_ACCESS_TOKEN_EXPIRATION') ||
			'15m';
		return this.parseTokenExpiration(expiresIn);
	}

	getRefreshTokenExpirationSeconds(): number {
		const expiresIn =
			this.config_service.get<string>('jwt.refreshTokenExpiration') ||
			this.config_service.get<string>('JWT_REFRESH_TOKEN_EXPIRATION') ||
			'7d';
		return this.parseTokenExpiration(expiresIn);
	}

	private parseTokenExpiration(expiration: string): number {
		const match = /^([1-9]\d*)([smhdwy])$/.exec(expiration);
		if (!match) {
			throw new Error(
				'JWT expiration must be a positive integer followed by s, m, h, d, w, or y',
			);
		}

		const secondsPerUnit: Record<string, number> = {
			s: 1,
			m: 60,
			h: 60 * 60,
			d: 24 * 60 * 60,
			w: 7 * 24 * 60 * 60,
			y: 365.25 * 24 * 60 * 60,
		};
		const seconds = Number(match[1]) * secondsPerUnit[match[2]];
		if (!Number.isSafeInteger(seconds)) {
			throw new Error('JWT expiration exceeds the supported time range');
		}
		return seconds;
	}

	async storeRefreshToken(user_id: string, token: string): Promise<void> {
		await this.users_service.setCurrentRefreshToken(
			user_id,
			this.hashRefreshToken(token),
		);
	}

	async logout(user_id: string): Promise<void> {
		await this.users_service.setCurrentRefreshToken(user_id, null);
	}

	private hashRefreshToken(token: string): string {
		return createHmac(
			'sha256',
			this.config_service.getOrThrow<string>('jwt.refreshTokenSecret'),
		)
			.update(token)
			.digest('hex');
	}

	private twoFactorChallengeSecret(): string {
		return createHmac(
			'sha256',
			this.config_service.getOrThrow<string>('jwt.accessTokenSecret'),
		)
			.update('nestjs-base-two-factor-challenge-v1')
			.digest('hex');
	}

	async validateGoogleUser(profile: {
		googleId: string;
		email: string;
		emailVerified: boolean;
		firstName: string;
		lastName: string;
		avatar?: string;
	}): Promise<User> {
		if (!profile.emailVerified) {
			throw new UnauthorizedException('Google email must be verified');
		}
		const email = normalizeEmail(profile.email);
		let user = await this.users_service.findOneByCondition({
			email,
		});

		if (!user) {
			user = await this.users_service.create({
				email,
				first_name: profile.firstName,
				last_name: profile.lastName,
				username: `${profile.email.split('@')[0]}${Math.floor(
					10 + Math.random() * (999 - 10),
				)}`,
				avatar: profile.avatar,
				googleId: profile.googleId,
				isEmailVerified: true,
				password: null,
			} as any);
		} else if (!user.googleId) {
			await this.users_service.update(user.id, {
				googleId: profile.googleId,
				avatar: profile.avatar,
				isEmailVerified: true,
			});
		}

		return user;
	}

	async loginWithGoogle(user: User) {
		return this.signIn(user.id);
	}
}
