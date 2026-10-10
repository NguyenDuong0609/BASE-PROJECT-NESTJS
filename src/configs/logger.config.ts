import { Params, PinoLogger } from 'nestjs-pino';
import { IncomingMessage } from 'http';
import { randomUUID } from 'node:crypto';

/**
 * Pino Logger Configuration for NestJS
 *
 * - Dev: pretty print with colors
 * - Prod: raw JSON (for CloudWatch / Datadog / ELK / Loki)
 * - Redacts sensitive data (authorization, password, tokens)
 * - Generates correlation / request IDs
 * - Ignores health check endpoints to reduce noise
 */
export const loggerConfig = (
	environment = process.env.NODE_ENV || 'development',
	level = process.env.LOG_LEVEL,
	format = process.env.LOG_FORMAT || 'pretty',
): Params => {
	const isProductionLike =
		environment === 'production' || environment === 'staging';

	return {
		pinoHttp: {
			level: level || (isProductionLike ? 'info' : 'debug'),

			// Keep staging and production logs as JSON for log collectors.
			transport:
				!isProductionLike && format !== 'json'
					? {
							target: 'pino-pretty',
							options: {
								singleLine: true,
								colorize: true,
								translateTime: 'SYS:standard',
								ignore: 'pid,hostname',
							},
						}
					: undefined,

			// Redact sensitive data from logs
			redact: {
				paths: [
					'req.headers.authorization',
					'req.headers.cookie',
					'req.headers["x-api-key"]',
					'body.password',
					'body.currentPassword',
					'body.newPassword',
					'body.token',
					'body.refreshToken',
					'body.accessToken',
					'body.creditCard',
				],
				remove: true,
			},

			// Generate a server-owned ID instead of trusting caller-supplied values.
			genReqId: (_req, res): string => {
				const requestId = randomUUID();
				res.setHeader('x-request-id', requestId);
				return requestId;
			},
			customAttributeKeys: { reqId: 'requestId' },
			autoLogging: {
				ignore: (req: IncomingMessage) =>
					req.url === '/health' ||
					req.url === '/health/ready' ||
					req.url === '/health/live',
			},

			// Custom properties added to every log line
			customProps: (req: IncomingMessage): Record<string, string> => ({
				context: 'HTTP',
				remoteAddress: req.socket.remoteAddress || 'unknown',
			}),

			// Serializers – control what gets logged for req/res
			serializers: {
				req: (req: Record<string, unknown>) => {
					const request = req as Record<string, unknown> & {
						id?: string;
						method?: string;
						url?: string;
						user?: { id?: string };
						socket?: { remoteAddress?: string };
						headers?: Record<string, unknown>;
					};
					return {
						id: request.id,
						method: request.method,
						url: request.url?.split('?', 1)[0] || '/',
						remoteAddress: request.socket?.remoteAddress,
						userId: request.user?.id,
						userAgent: request.headers?.['user-agent'],
					};
				},
				res: (res: Record<string, unknown>) => ({
					statusCode: res.statusCode,
				}),
			},
		},
	};
};

export function createContextLogger(
	context: string,
	providedLogger?: PinoLogger,
): PinoLogger {
	const logger = providedLogger ?? new PinoLogger(loggerConfig());
	logger.setContext(context);
	return logger;
}
