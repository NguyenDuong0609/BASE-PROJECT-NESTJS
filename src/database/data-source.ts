import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

const envFile = process.env.NODE_ENV === 'development' ? '.env.dev' : '.env';
config({ path: envFile });

export default new DataSource({
	type: 'postgres',
	host: process.env.DB_HOST,
	port: parseInt(process.env.DB_PORT, 10),
	username: process.env.DB_USERNAME,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_DATABASE,
	entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
	migrations: [join(__dirname, './migrations/*{.ts,.js}')],
	migrationsTableName: 'migrations',
	synchronize: false,
	logging: process.env.DB_LOGGING === 'true',
});
