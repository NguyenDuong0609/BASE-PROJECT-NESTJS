import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { join } from 'path';

@Module({
	imports: [
		MailerModule.forRootAsync({
			imports: [ConfigModule],
			useFactory: async (config: ConfigService) =>
				({
					transport: {
						host: config.get('MAIL_HOST'),
						port: config.get('MAIL_PORT'),
						secure: false,
						auth: {
							user: config.get('MAIL_USER'),
							pass: config.get('MAIL_PASSWORD'),
						},
					},
					defaults: {
						from: `"No Reply" <${config.get('MAIL_FROM')}>`,
					},
					template: {
						dir: join(process.cwd(), 'src', 'modules', 'mail', 'templates'),
						adapter: new HandlebarsAdapter(),
						options: {
							strict: true,
						},
					},
				}) as any,
			inject: [ConfigService],
		}),
	],
	providers: [MailService],
	exports: [MailService],
})
export class MailModule {}
