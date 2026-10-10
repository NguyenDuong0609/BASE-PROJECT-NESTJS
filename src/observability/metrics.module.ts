import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsRegistry } from './metrics.registry';
import { QueueModule } from '@modules/queue/queue.module';

@Module({
	imports: [QueueModule],
	controllers: [MetricsController],
	providers: [
		MetricsRegistry,
		{
			provide: APP_INTERCEPTOR,
			useClass: MetricsInterceptor,
		},
	],
	exports: [MetricsRegistry],
})
export class MetricsModule {}
