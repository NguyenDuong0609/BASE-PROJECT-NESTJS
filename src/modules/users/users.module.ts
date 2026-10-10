import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersRepository } from '@repositories/users.repository';
import { UserRolesModule } from '@modules/user-roles/user-roles.module';

import { Address } from './entities/address.entity';
import { AuditLogModule } from '../../observability/audit-log.module';

@Module({
	imports: [
		TypeOrmModule.forFeature([User, Address]),
		UserRolesModule,
		AuditLogModule,
	],
	controllers: [UsersController],
	providers: [
		UsersService,
		{ provide: 'UsersRepositoryInterface', useClass: UsersRepository },
	],
	exports: [UsersService],
})
export class UsersModule {}
