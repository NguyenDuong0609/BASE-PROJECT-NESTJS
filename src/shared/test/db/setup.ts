import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

export const rootTypeOrmTestModule = (options: any = {}) =>
	TypeOrmModule.forRoot({
		type: 'sqlite',
		database: ':memory:',
		dropSchema: true,
		entities: [__dirname + '/../../../**/*.entity{.ts,.js}'],
		synchronize: true,
		...options,
	} as TypeOrmModuleOptions);
