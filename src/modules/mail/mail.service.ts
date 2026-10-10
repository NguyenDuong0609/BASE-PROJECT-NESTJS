import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { PinoLogger } from 'nestjs-pino';
import { createContextLogger } from '../../configs/logger.config';

@Injectable()
export class MailService {
	constructor(
		private readonly mailerService: MailerService,
		logger: PinoLogger,
	) {
		this.logger = createContextLogger(MailService.name, logger);
	}

	private readonly logger: PinoLogger;

	async sendWelcomeEmail(to: string, name: string) {
		try {
			await this.mailerService.sendMail({
				to,
				subject: 'Welcome to our platform!',
				template: './welcome',
				context: {
					name,
				},
			});
			this.logger.info('Welcome email sent');
		} catch (error) {
			this.logger.error({ err: error }, 'Failed to send welcome email');
			throw error;
		}
	}

	async sendGenericEmail(
		to: string,
		subject: string,
		template: string,
		context: any,
	) {
		try {
			await this.mailerService.sendMail({
				to,
				subject,
				template: `./${template}`,
				context,
			});
			this.logger.info({ template }, 'Generic email sent');
		} catch (error) {
			this.logger.error(
				{ err: error, template },
				'Failed to send generic email',
			);
			throw error;
		}
	}
}
