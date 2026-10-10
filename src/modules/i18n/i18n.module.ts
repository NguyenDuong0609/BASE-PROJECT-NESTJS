import { Module } from '@nestjs/common';
import {
	I18nModule as NestI18nModule,
	AcceptLanguageResolver,
	HeaderResolver,
	QueryResolver,
} from 'nestjs-i18n';
import * as path from 'path';

@Module({
	imports: [
		NestI18nModule.forRoot({
			fallbackLanguage: 'en',
			loaderOptions: {
				path: path.join(process.cwd(), 'src', 'i18n'),
				watch: true,
			},
			resolvers: [
				{ use: QueryResolver, options: ['lang'] },
				AcceptLanguageResolver,
				new HeaderResolver(['x-lang']),
			],
		}),
	],
})
export class I18nConfigModule {}
