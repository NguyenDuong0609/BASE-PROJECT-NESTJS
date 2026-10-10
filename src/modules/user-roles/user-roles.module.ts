import { Module } from '@nestjs/common';
import { UserRolesService } from './user-roles.service';
import { UserRolesController } from './user-roles.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRole } from './entities/user-role.entity';
import { UserRolesRepository } from '@repositories/user-roles.repository';
import { User } from '@modules/users/entities/user.entity';
import { AuditLogModule } from '../../observability/audit-log.module';

@Module({
	imports: [TypeOrmModule.forFeature([UserRole, User]), AuditLogModule],
	controllers: [UserRolesController],
	providers: [
		UserRolesService,
		{
			provide: 'UserRolesRepositoryInterface',
			useClass: UserRolesRepository,
		},
	],
	exports: [UserRolesService],
})
export class UserRolesModule {}
