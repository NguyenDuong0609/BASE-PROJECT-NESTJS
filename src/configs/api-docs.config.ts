import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NextFunction, Request, Response } from 'express';

export function configSwagger(
	app: INestApplication,
	configService: ConfigService,
) {
	if (!configService.get<boolean>('swagger.enabled')) {
		return;
	}

	const username = configService.getOrThrow<string>('swagger.username');
	const password = configService.getOrThrow<string>('swagger.password');
	const config = new DocumentBuilder()
		.setTitle('NestJS Base API')
		.setDescription(
			'REST API starter template. Domain routes are controlled by ENABLE_* feature flags. JSON responses use the standard API envelope.',
		)
		.setVersion('1.0')
		.addSecurity('token', { type: 'http', scheme: 'bearer' })
		.build();
	const document = SwaggerModule.createDocument(app, config);

	const http_adapter = app.getHttpAdapter();
	http_adapter.use(
		'/api-docs',
		(req: Request, res: Response, next: NextFunction) => {
			const [scheme, encoded] = (req.headers.authorization || '').split(' ');
			const decoded =
				scheme === 'Basic'
					? Buffer.from(encoded || '', 'base64').toString()
					: '';
			const separator = decoded.indexOf(':');
			if (
				separator < 1 ||
				decoded.slice(0, separator) !== username ||
				decoded.slice(separator + 1) !== password
			) {
				res.setHeader('WWW-Authenticate', 'Basic realm="API documentation"');
				res.status(401).end();
				return;
			}

			next();
		},
	);
	SwaggerModule.setup('api-docs', app, document, {
		swaggerOptions: { persistAuthorization: true },
		customSiteTitle: 'Flash Card Documentation',
		customfavIcon: '/swagger.ico',
	});
}
