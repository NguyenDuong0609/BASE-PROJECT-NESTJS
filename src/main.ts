import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configSwagger } from '@configs/api-docs.config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';
import { Logger as PinoLogger } from 'nestjs-pino';

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		bufferLogs: true,
	});
	const logger = app.get(PinoLogger);
	app.useLogger(logger);
	const config_service = app.get(ConfigService);
	app.set('trust proxy', config_service.get<number>('app.trustProxyHops', 0));
	const origins = config_service.get<string[]>('cors.origins') || [];
	app.enableCors({
		origin: origins.length ? origins : false,
		credentials: origins.length > 0,
	});
	app.use(helmet());
	configSwagger(app, config_service);
	app.useStaticAssets(join(__dirname, './served'));
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		}),
	);
	app.enableShutdownHooks();
	await app.listen(config_service.get('PORT'), '0.0.0.0', () =>
		logger.log(`Application running on port ${config_service.get('PORT')}`),
	);
}
bootstrap();
