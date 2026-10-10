import { Global, Module } from '@nestjs/common';
import { MetricsModule } from '../../../../observability/metrics.module';
import { AppCacheService } from './app-cache.service';

@Global()
@Module({
	imports: [MetricsModule],
	providers: [AppCacheService],
	exports: [AppCacheService],
})
export class AppCacheModule {}
