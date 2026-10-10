import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { Request } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_HEADER = 'x-csrf-token';

@Injectable()
export class CsrfGuard implements CanActivate {
	constructor(private readonly config: ConfigService) {}

	canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest<Request>();
		if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

		const cookies = this.parseCookies(request.headers.cookie);
		const hasAuthCookie = Boolean(
			Object.prototype.hasOwnProperty.call(cookies, 'access_token') ||
			Object.prototype.hasOwnProperty.call(cookies, 'refresh_token') ||
			Object.prototype.hasOwnProperty.call(cookies, 'two_factor_challenge'),
		);
		if (!hasAuthCookie) return true;

		const origin = request.headers.origin;
		if (typeof origin !== 'string' || !this.isAllowedOrigin(origin, request)) {
			throw new ForbiddenException('Invalid request origin');
		}

		const csrfCookieName = this.isProductionLike()
			? '__Host-csrf_token'
			: 'csrf_token';
		const cookieToken = cookies[csrfCookieName];
		const headerToken = request.headers[CSRF_HEADER] as string | undefined;
		if (
			!cookieToken ||
			!headerToken ||
			Array.isArray(headerToken) ||
			!this.constantTimeEqual(cookieToken, headerToken)
		) {
			throw new ForbiddenException('A valid CSRF token is required');
		}

		return true;
	}

	private isAllowedOrigin(origin: string, request: Request): boolean {
		const allowedOrigins = this.config.get<string[]>('cors.origins') ?? [];
		if (allowedOrigins.includes(origin)) return true;

		try {
			const parsedOrigin = new URL(origin);
			const requestHost = request.get('host');
			const productionLike = this.isProductionLike();
			return (
				parsedOrigin.origin === origin &&
				parsedOrigin.host.toLowerCase() === requestHost?.toLowerCase() &&
				(productionLike
					? parsedOrigin.protocol === 'https:'
					: ['http:', 'https:'].includes(parsedOrigin.protocol))
			);
		} catch {
			return false;
		}
	}

	private parseCookies(header?: string): Record<string, string> {
		if (!header) return {};
		const cookies: Record<string, string> = Object.create(null);
		for (const item of header.split(';')) {
			const separator = item.indexOf('=');
			if (separator < 1) continue;
			const name = item.slice(0, separator).trim();
			const value = item.slice(separator + 1).trim();
			if (Object.prototype.hasOwnProperty.call(cookies, name)) {
				cookies[name] = '';
			} else {
				cookies[name] = value;
			}
		}
		return cookies;
	}

	private constantTimeEqual(left: string, right: string): boolean {
		const leftBuffer = Buffer.from(left);
		const rightBuffer = Buffer.from(right);
		return (
			leftBuffer.length === rightBuffer.length &&
			timingSafeEqual(leftBuffer, rightBuffer)
		);
	}

	private isProductionLike(): boolean {
		const environment = this.config.get<string>('app.environment');
		return environment === 'production' || environment === 'staging';
	}
}
