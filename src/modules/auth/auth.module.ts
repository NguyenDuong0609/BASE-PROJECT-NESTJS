import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { UsersModule } from '@modules/users/users.module';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtModule } from '@nestjs/jwt';
import { JwtAccessTokenStrategy } from './strategies/jwt-access-token.strategy';
import { JwtRefreshTokenStrategy } from './strategies/jwt-refresh-token.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { AccountLifecycleService } from './account-lifecycle.service';
import { EmailDeliveryModule } from './email-delivery.module';
import { AccountActionToken } from './entities/account-action-token.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogModule } from '../../observability/audit-log.module';
import { TwoFactorAuthService } from './two-factor-auth.service';

@Module({
	imports: [
		UsersModule,
		TypeOrmModule.forFeature([AccountActionToken]),
		EmailDeliveryModule,
		AuditLogModule,
		PassportModule,
		JwtModule.registerAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: () => ({}),
		}),
	],
	controllers: [AuthController],
	providers: [
		AuthService,
		LocalStrategy,
		JwtAccessTokenStrategy,
		JwtRefreshTokenStrategy,
		GoogleStrategy,
		GoogleOAuthGuard,
		AccountLifecycleService,
		TwoFactorAuthService,
	],
})
export class AuthModule {}
