import {
	Injectable,
	Optional,
	ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { PinoLogger } from 'nestjs-pino';
import { createContextLogger } from '../../configs/logger.config';

@Injectable()
export class EmailDeliveryService {
	private readonly logger: PinoLogger;
	private readonly transporter?: Transporter;
	private readonly from: string;

	constructor(configService: ConfigService, @Optional() logger?: PinoLogger) {
		this.logger = createContextLogger(EmailDeliveryService.name, logger);
		const host = configService.get<string>('mail.host');
		const fromEmail = configService.get<string>('mail.from');
		this.from = fromEmail
			? `"${configService.get<string>('mail.fromName', 'Application')}" <${fromEmail}>`
			: '';

		if (configService.get<boolean>('features.accountEmailFlows') && host) {
			const user = configService.get<string>('mail.user');
			const password = configService.get<string>('mail.password');
			this.transporter = nodemailer.createTransport({
				host,
				port: configService.get<number>('mail.port', 587),
				secure: configService.get<boolean>('mail.secure', false),
				...(user && password ? { auth: { user, pass: password } } : {}),
			});
		}
	}

	async sendAccountAction(
		to: string,
		subject: string,
		url: string,
	): Promise<void> {
		if (!this.transporter || !this.from) {
			throw new ServiceUnavailableException(
				'Account email delivery is not configured',
			);
		}

		try {
			await this.transporter.sendMail({
				from: this.from,
				to,
				subject,
				text: `Use this link to continue: ${url}\n\nIf you did not request this, ignore this email.`,
			});
		} catch (error) {
			this.logger.error({ err: error }, 'Account email delivery failed');
			throw new ServiceUnavailableException(
				'Account email could not be delivered',
			);
		}
	}
}
