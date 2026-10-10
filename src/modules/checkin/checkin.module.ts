import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Checkin } from './entities/checkin.entity';
import { CheckinStats } from './entities/checkin-stats.entity';
import { CheckinService } from './checkin.service';
import { CheckinController } from './checkin.controller';
import { AuditLogModule } from '../../observability/audit-log.module';

@Module({
	imports: [TypeOrmModule.forFeature([Checkin, CheckinStats]), AuditLogModule],
	controllers: [CheckinController],
	providers: [CheckinService],
	exports: [CheckinService],
})
export class CheckinModule {}
