import {
	Body,
	Controller,
	Get,
	Post,
	Req,
	Res,
	UseGuards,
	UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local.guard';
import { RequestWithUser } from 'src/types/requests.type';
import { JwtRefreshTokenGuard } from './guards/jwt-refresh-token.guard';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import {
	ApiBadRequestResponse,
	ApiBearerAuth,
	ApiBody,
	ApiConflictResponse,
	ApiCreatedResponse,
	ApiOperation,
	ApiResponse,
	ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { ApiSuccessMessage } from 'src/decorators/api-success-message.decorator';
import { AccountLifecycleService } from './account-lifecycle.service';
import {
	AccountActionTokenDto,
	AccountEmailDto,
	PasswordResetDto,
} from './dto/account-action.dto';
import { FeatureFlag } from '../../decorators/feature-flag.decorator';
import { AuditLogService } from '../../observability/audit-log.service';
import { randomBytes } from 'node:crypto';
import { TwoFactorAuthService } from './two-factor-auth.service';
import { JwtAccessTokenGuard } from './guards/jwt-access-token.guard';
import {
	TwoFactorChallengeDto,
	TwoFactorCodeDto,
	TwoFactorDisableDto,
	TwoFactorSetupDto,
} from './dto/two-factor.dto';
import { extractCookieToken } from './utils/cookie-token.extractor';

@Controller('auth')
@ApiTags('auth')
@Throttle({ default: { limit: 5, ttl: 60_000 } })
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly configService: ConfigService,
		private readonly accountLifecycle: AccountLifecycleService,
		private readonly auditLog: AuditLogService,
		private readonly twoFactor: TwoFactorAuthService,
	) {}

	@Get('csrf-token')
	@ApiOperation({
		summary: 'Issue a CSRF token for cookie-authenticated clients',
	})
	getCsrfToken(@Res({ passthrough: true }) response: Response) {
		const token = randomBytes(32).toString('base64url');
		const options = this.authCookieOptions();
		response.cookie(this.csrfCookieName(), token, {
			...options,
			httpOnly: false,
			maxAge: 60 * 60 * 1000,
		});
		return { csrfToken: token };
	}

	@Post('sign-up')
	@ApiSuccessMessage('USER_REGISTERED')
	@ApiOperation({
		summary: 'User sign up to platform',
		description:
			'Create an account with email and password. Passwords must meet the strong-password validation rules.',
	})
	@ApiBody({
		type: SignUpDto,
		examples: {
			user_1: {
				value: {
					first_name: 'John',
					last_name: 'Doe',
					email: 'johndoe@example.com',
					password: 'ExamplePass123!',
				} as SignUpDto,
			},
			user_2: {
				value: {
					first_name: 'Michael',
					last_name: 'Smith',
					email: 'michaelsmith@example.com',
					password: 'ExamplePass123!',
				} as SignUpDto,
			},
		},
	})
	@ApiCreatedResponse({
		description: 'User created successfully!!',
		content: {
			'application/json': {
				examples: {
					created_user: {
						summary: 'Response after sign up',
						value: {
							access_token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
							refresh_token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
						},
					},
				},
			},
		},
	})
	@ApiBadRequestResponse({
		description: 'Validation failed',
		content: {
			'application/json': {
				examples: {
					invalid_email_password: {
						value: {
							statusCode: 400,
							message: [
								'email must be an email',
								'password is not strong enough',
							],
							error: 'Bad Request',
						},
					},
					some_fields_missing: {
						value: {
							statusCode: 400,
							message: [
								'last_name must be shorter than or equal to 50 characters',
								'last_name should not be empty',
							],
							error: 'Bad Request',
						},
					},
				},
			},
		},
	})
	@ApiConflictResponse({
		description: 'Conflict user info',
		content: {
			'application/json': {
				examples: {
					email_duplication: {
						value: {
							statusCode: 409,
							message: 'Email already existed!!',
							error: 'Conflict',
						},
					},
					username_duplication: {
						value: {
							statusCode: 409,
							message: 'Username already existed!!',
							error: 'Conflict',
						},
					},
				},
			},
		},
	})
	async signUp(@Body() signUpDto: SignUpDto) {
		const tokens = await this.authService.signUp(signUpDto);
		if (this.configService.get<boolean>('auth.requireVerifiedEmail')) {
			await this.accountLifecycle.requestEmailVerification(signUpDto.email);
		}
		return tokens;
	}

	@Post('password-reset/request')
	@FeatureFlag('accountEmailFlows')
	@ApiOperation({ summary: 'Request a password reset email' })
	async requestPasswordReset(@Body() body: AccountEmailDto) {
		await this.accountLifecycle.requestPasswordReset(body.email);
		return { message: 'If the account exists, a reset link will be sent' };
	}

	@Post('password-reset/confirm')
	@FeatureFlag('accountEmailFlows')
	@ApiOperation({ summary: 'Set a new password using a reset token' })
	async resetPassword(@Body() body: PasswordResetDto) {
		await this.accountLifecycle.resetPassword(body.token, body.password);
		return { message: 'Password has been reset' };
	}

	@Post('email-verification/request')
	@FeatureFlag('accountEmailFlows')
	@ApiOperation({ summary: 'Request an email verification link' })
	async requestEmailVerification(@Body() body: AccountEmailDto) {
		await this.accountLifecycle.requestEmailVerification(body.email);
		return { message: 'If verification is needed, a link will be sent' };
	}

	@Post('email-verification/confirm')
	@FeatureFlag('accountEmailFlows')
	@ApiOperation({ summary: 'Verify an email address using a token' })
	async verifyEmail(@Body() body: AccountActionTokenDto) {
		await this.accountLifecycle.verifyEmail(body.token);
		return { message: 'Email address verified' };
	}

	@UseGuards(LocalAuthGuard)
	@Post('sign-in')
	@ApiSuccessMessage('USER_SIGNED_IN')
	@ApiBody({
		type: SignInDto,
		examples: {
			user_1: {
				value: {
					email: 'johndoe@example.com',
					password: 'ExamplePass123!',
				} as SignInDto,
			},
		},
	})
	@ApiResponse({
		status: 401,
		description: 'Unauthorized',
		content: {
			'application/json': {
				example: {
					statusCode: 400,
					message: 'Wrong credentials!!',
					error: 'Bad Request',
				},
			},
		},
	})
	async signIn(@Req() request: RequestWithUser, @Body() body: SignInDto) {
		const { user } = request;
		if (user.isTwoFactorAuthenticationEnabled) {
			if (!body.twoFactorCode) {
				return {
					requiresTwoFactor: true,
					challengeToken: this.authService.issueTwoFactorChallenge(user.id),
				};
			}
			if (!(await this.twoFactor.verifyUserCode(user.id, body.twoFactorCode))) {
				throw new UnauthorizedException('Invalid two-factor code');
			}
		}
		const tokens = await this.authService.signIn(user.id);
		await this.auditLog.record('AUTH_SIGN_IN', user.id, user.id);
		return tokens;
	}

	@Post('2fa/challenge')
	@ApiOperation({
		summary: 'Complete a password or Google two-factor challenge',
	})
	async completeTwoFactorChallenge(
		@Body() body: TwoFactorChallengeDto,
		@Req() request: RequestWithUser,
		@Res({ passthrough: true }) response: Response,
	) {
		const cookieChallenge = extractCookieToken(request, 'two_factor_challenge');
		const challengeToken = body.challengeToken || cookieChallenge;
		if (!challengeToken) {
			throw new UnauthorizedException('Two-factor challenge is required');
		}
		const userId = this.authService.verifyTwoFactorChallenge(challengeToken);
		if (!(await this.twoFactor.verifyUserCode(userId, body.code))) {
			throw new UnauthorizedException('Invalid two-factor code');
		}
		response.clearCookie('two_factor_challenge', {
			...this.authCookieOptions(),
			path: '/auth/2fa/challenge',
		});
		const tokens = await this.authService.signIn(userId);
		await this.auditLog.record('AUTH_TWO_FACTOR_SIGN_IN', userId, userId);
		if (cookieChallenge && !body.challengeToken) {
			this.setAuthCookies(response, tokens);
			return { authenticated: true };
		}
		return tokens;
	}

	@Post('2fa/setup')
	@FeatureFlag('twoFactor')
	@UseGuards(JwtAccessTokenGuard)
	@ApiBearerAuth('token')
	@ApiOperation({ summary: 'Create a TOTP secret for the current account' })
	async setupTwoFactor(
		@Req() request: RequestWithUser,
		@Body() body: TwoFactorSetupDto,
	) {
		if (
			!(await this.authService.verifyPassword(request.user.id, body.password))
		) {
			throw new UnauthorizedException('Current password is incorrect');
		}
		return this.twoFactor.generateTwoFactorAuthenticationSecret(request.user);
	}

	@Post('2fa/enable')
	@FeatureFlag('twoFactor')
	@UseGuards(JwtAccessTokenGuard)
	@ApiBearerAuth('token')
	@ApiOperation({
		summary: 'Confirm and enable TOTP two-factor authentication',
	})
	async enableTwoFactor(
		@Req() request: RequestWithUser,
		@Body() body: TwoFactorCodeDto,
	) {
		await this.twoFactor.turnOnTwoFactorAuthentication(
			request.user.id,
			body.code,
		);
		await this.auditLog.record(
			'ACCOUNT_TWO_FACTOR_ENABLED',
			request.user.id,
			request.user.id,
		);
		return { enabled: true };
	}

	@Post('2fa/disable')
	@FeatureFlag('twoFactor')
	@UseGuards(JwtAccessTokenGuard)
	@ApiBearerAuth('token')
	@ApiOperation({
		summary: 'Disable TOTP after password and code verification',
	})
	async disableTwoFactor(
		@Req() request: RequestWithUser,
		@Body() body: TwoFactorDisableDto,
	) {
		if (
			!(await this.authService.verifyPassword(request.user.id, body.password))
		) {
			throw new UnauthorizedException('Current password is incorrect');
		}
		await this.twoFactor.turnOffTwoFactorAuthentication(
			request.user.id,
			body.code,
		);
		await this.auditLog.record(
			'ACCOUNT_TWO_FACTOR_DISABLED',
			request.user.id,
			request.user.id,
		);
		return { enabled: false };
	}

	@UseGuards(JwtRefreshTokenGuard)
	@Post('refresh')
	@ApiBearerAuth('token')
	@ApiSuccessMessage('TOKEN_REFRESHED')
	async refreshAccessToken(
		@Req() request: RequestWithUser,
		@Res({ passthrough: true }) response: Response,
	) {
		const tokens = await this.authService.signIn(request.user.id);
		await this.auditLog.record(
			'AUTH_TOKEN_REFRESH',
			request.user.id,
			request.user.id,
		);
		this.setAuthCookies(response, tokens);
		return tokens;
	}

	@UseGuards(JwtRefreshTokenGuard)
	@Post('logout')
	@ApiBearerAuth('token')
	@ApiSuccessMessage('SIGNED_OUT')
	async logout(
		@Req() request: RequestWithUser,
		@Res({ passthrough: true }) response: Response,
	) {
		await this.authService.logout(request.user.id);
		await this.auditLog.record('AUTH_LOGOUT', request.user.id, request.user.id);
		const cookieOptions = this.authCookieOptions();
		response.clearCookie('access_token', cookieOptions);
		response.clearCookie('refresh_token', cookieOptions);
		response.clearCookie(this.csrfCookieName(), this.authCookieOptions());
		return { message: 'Logged out successfully' };
	}

	@Get('google')
	@UseGuards(GoogleOAuthGuard)
	@ApiOperation({ summary: 'Initiate Google OAuth login' })
	googleAuth() {
		return { status: 'redirecting' };
	}

	@Get('google/callback')
	@UseGuards(GoogleOAuthGuard)
	@ApiOperation({ summary: 'Google OAuth callback' })
	async googleAuthCallback(@Req() req: RequestWithUser, @Res() res: Response) {
		const user = req.user;
		const frontendUrl = this.configService.getOrThrow<string>('frontend.url');
		if (user.isTwoFactorAuthenticationEnabled) {
			await this.auditLog.record('AUTH_GOOGLE_2FA_CHALLENGE', user.id, user.id);
			const challengeToken = this.authService.issueTwoFactorChallenge(user.id);
			res.cookie('two_factor_challenge', challengeToken, {
				...this.authCookieOptions(),
				path: '/auth/2fa/challenge',
				maxAge: 5 * 60 * 1000,
			});
			res.redirect(
				new URL(
					'/auth/callback?twoFactorRequired=true',
					frontendUrl,
				).toString(),
			);
			return;
		}
		const tokens = await this.authService.loginWithGoogle(user);
		await this.auditLog.record('AUTH_GOOGLE_SIGN_IN', user.id, user.id);
		this.setAuthCookies(res, tokens);
		res.redirect(new URL('/auth/callback', frontendUrl).toString());
	}

	private authCookieOptions() {
		const environment = this.configService.get<string>('app.environment');
		const isSecureEnvironment =
			environment === 'production' || environment === 'staging';
		return {
			httpOnly: true,
			secure: isSecureEnvironment,
			sameSite: isSecureEnvironment ? ('none' as const) : ('lax' as const),
			path: '/',
		};
	}

	private setAuthCookies(
		response: Response,
		tokens: { access_token: string; refresh_token: string },
	): void {
		const options = this.authCookieOptions();
		response.cookie('access_token', tokens.access_token, {
			...options,
			maxAge: this.authService.getAccessTokenExpirationSeconds() * 1000,
		});
		response.cookie('refresh_token', tokens.refresh_token, {
			...options,
			maxAge: this.authService.getRefreshTokenExpirationSeconds() * 1000,
		});
	}

	private csrfCookieName(): string {
		const environment = this.configService.get<string>('app.environment');
		return environment === 'production' || environment === 'staging'
			? '__Host-csrf_token'
			: 'csrf_token';
	}
}
