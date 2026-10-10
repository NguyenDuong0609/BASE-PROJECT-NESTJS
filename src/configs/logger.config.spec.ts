import { IncomingMessage, ServerResponse } from 'node:http';
import { loggerConfig } from './logger.config';

describe('logger configuration', () => {
	it('uses one server-generated request ID and returns it to the client', () => {
		const pinoHttp = loggerConfig('test', 'debug').pinoHttp as {
			genReqId: (request: IncomingMessage, response: ServerResponse) => string;
			customProps: (request: IncomingMessage) => Record<string, string>;
		};
		const setHeader = jest.fn();
		const requestId = pinoHttp.genReqId(
			{
				headers: { 'x-request-id': 'client-controlled-id' },
			} as unknown as IncomingMessage,
			{ setHeader } as unknown as ServerResponse,
		);

		expect(requestId).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
		);
		expect(requestId).not.toBe('client-controlled-id');
		expect(
			pinoHttp.customProps({
				socket: { remoteAddress: '127.0.0.1' },
			} as unknown as IncomingMessage),
		).toEqual({ context: 'HTTP', remoteAddress: '127.0.0.1' });
		expect(setHeader).toHaveBeenCalledWith('x-request-id', requestId);
	});

	it('removes query strings from access logs', () => {
		const pinoHttp = loggerConfig('production', 'info').pinoHttp as {
			serializers: {
				req: (request: Record<string, unknown>) => Record<string, unknown>;
			};
		};

		expect(
			pinoHttp.serializers.req({
				method: 'GET',
				url: '/auth/reset?token=secret',
				socket: { remoteAddress: '127.0.0.1' },
				headers: { 'user-agent': 'test' },
			}),
		).toMatchObject({ url: '/auth/reset', remoteAddress: '127.0.0.1' });
	});

	it('logs each request once and keeps health checks out of request logs', () => {
		const pinoHttp = loggerConfig('production', 'info').pinoHttp as {
			autoLogging: {
				ignore: (request: IncomingMessage) => boolean;
			};
			level: string;
			customAttributeKeys: { reqId: string };
			transport?: unknown;
		};

		expect(pinoHttp.level).toBe('info');
		expect(pinoHttp.customAttributeKeys.reqId).toBe('requestId');
		expect(pinoHttp.transport).toBeUndefined();
		expect(
			pinoHttp.autoLogging.ignore({ url: '/health/ready' } as IncomingMessage),
		).toBe(true);
		expect(
			pinoHttp.autoLogging.ignore({ url: '/users' } as IncomingMessage),
		).toBe(false);
	});

	it('can emit JSON in development for local log collection', () => {
		const pinoHttp = loggerConfig('development', 'debug', 'json').pinoHttp as {
			transport?: unknown;
		};
		expect(pinoHttp.transport).toBeUndefined();
	});
});
