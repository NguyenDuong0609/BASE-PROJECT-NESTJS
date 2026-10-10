import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRole } from '../user-roles/entities/user-role.entity';
import { Permission } from './entities/permission.entity';
import { PermissionsController } from './permissions.controller';
import { PermissionsGuard } from './permissions.guard';
import { PermissionsService } from './permissions.service';
import { AuditLogModule } from '../../observability/audit-log.module';

@Module({
	imports: [TypeOrmModule.forFeature([Permission, UserRole]), AuditLogModule],
	controllers: [PermissionsController],
	providers: [PermissionsService, PermissionsGuard],
	exports: [PermissionsService, PermissionsGuard],
})
export class PermissionsModule {}
