import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditLogModule } from '../../observability/audit-log.module';

@Module({
	imports: [AuditLogModule],
	controllers: [AuditController],
})
export class AuditModule {}
