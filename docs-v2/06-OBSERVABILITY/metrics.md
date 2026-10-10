# Metrics

Thu thập metrics Prometheus để giám sát performance và health.

## Tổng quan

- **Framework**: Prometheus (tùy chọn)
- **Endpoint**: `/metrics`
- **Types**: Counters, Histograms, Gauges
- **Scope**: Process-local (reset on restart)
- **Feature Flag**: `ENABLE_METRICS=true`

## Configuration

### Environment Variables

```env
ENABLE_METRICS=false
```

### Prometheus Configuration

```typescript
// src/observability/metrics/metrics.module.ts
import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';

@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
```

## Metric Types

### Counters

Counter chỉ tăng, không giảm.

```typescript
// HTTP request counter
http_request_total{method="GET",route="/users",status="200"} 1250

// Cache hits
cache_hit_total{cache="redis"} 5432

// Queue jobs
queue_job_added_total{queue="email"} 100
queue_job_completed_total{queue="email"} 95
queue_job_failed_total{queue="email"} 5
```

### Histograms

Histogram đo distribution của values.

```typescript
// Request duration histogram
http_request_duration_seconds_bucket{le="0.005"} 100
http_request_duration_seconds_bucket{le="0.01"} 250
http_request_duration_seconds_bucket{le="0.025"} 400
http_request_duration_seconds_bucket{le="0.05"} 450
http_request_duration_seconds_bucket{le="0.1"} 480
http_request_duration_seconds_bucket{le="0.25"} 495
http_request_duration_seconds_bucket{le="0.5"} 498
http_request_duration_seconds_bucket{le="1"} 500
http_request_duration_seconds_bucket{le="+Inf"} 500
http_request_duration_seconds_sum 12.5
http_request_duration_seconds_count 500
```

### Gauges

Gauge có thể tăng hoặc giảm.

```typescript
// Database connection pool
db_pool_active_connections 15
db_pool_idle_connections 5
db_pool_max_connections 20

// Queue size
queue_size{queue="email"} 10
queue_size{queue="image"} 25
queue_size{queue="notification"} 5

// Memory usage
process_memory_usage_bytes 134217728
```

## Metrics Collected

### HTTP Metrics

```typescript
// Request count by method, route, status
http_request_total{method="GET",route="/users",status="200"}

// Request duration histogram
http_request_duration_seconds{route="/users"}

// Request size (optional)
http_request_size_bytes{route="/media/upload"}

// Response size (optional)
http_response_size_bytes{route="/media/download"}
```

### Database Metrics

```typescript
// Query duration
db_query_duration_seconds{query="SELECT * FROM users"}

// Connection pool
db_pool_active_connections
db_pool_idle_connections
db_pool_max_connections

// Transaction duration
db_transaction_duration_seconds
```

### Cache Metrics

```typescript
// Cache hits/misses
cache_hit_total{cache="redis",key="user"}
cache_miss_total{cache="redis",key="user"}

// Cache operations
cache_set_total{cache="redis"}
cache_get_total{cache="redis"}
cache_delete_total{cache="redis"}
```

### Queue Metrics

```typescript
// Queue size
queue_size{queue="email"}

// Job counts
queue_job_added_total{queue="email"}
queue_job_completed_total{queue="email"}
queue_job_failed_total{queue="email"}
queue_job_retry_total{queue="email"}

// Job duration
queue_job_duration_seconds{queue="email",job="send-email"}
```

### System Metrics

```typescript
// Memory
process_memory_usage_bytes
process_memory_heap_usage_bytes
process_memory_heap_total_bytes

// CPU
process_cpu_seconds_total

// Event loop
process_event_loop_lag_seconds
process_event_loop_utilization
```

## Implementation

### Metrics Service

```typescript
// src/observability/metrics/metrics.service.ts
import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge, Registry } from 'prom-client';

@Injectable()
export class MetricsService {
  private httpRequestTotal: Counter;
  private httpRequestDuration: Histogram;
  private dbPoolActive: Gauge;

  constructor() {
    const register = new Registry();

    this.httpRequestTotal = new Counter({
      name: 'http_request_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [register],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['route'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [register],
    });

    this.dbPoolActive = new Gauge({
      name: 'db_pool_active_connections',
      help: 'Number of active database connections',
      registers: [register],
    });
  }

  incrementHttpRequest(method: string, route: string, status: number) {
    this.httpRequestTotal.inc({ method, route, status });
  }

  observeHttpRequestDuration(route: string, duration: number) {
    this.httpRequestDuration.observe({ route }, duration);
  }

  setDbPoolActiveConnections(count: number) {
    this.dbPoolActive.set(count);
  }

  getMetrics(): string {
    return this.httpRequestTotal.register.metrics();
  }
}
```

### Metrics Interceptor

```typescript
// src/observability/metrics/metrics.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const start = Date.now();
    const { method, url } = request;

    return next.handle().pipe(
      tap(() => {
        const duration = (Date.now() - start) / 1000;
        const status = context.switchToHttp().getResponse().statusCode;

        this.metricsService.incrementHttpRequest(method, url, status);
        this.metricsService.observeHttpRequestDuration(url, duration);
      }),
    );
  }
}
```

### Metrics Controller

```typescript
// src/observability/metrics/metrics.controller.ts
import { Controller, Get, Header } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain')
  metrics() {
    return this.metricsService.getMetrics();
  }
}
```

## Prometheus Setup

### Scrape Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'nestjs-api'
    scrape_interval: 15s
    static_configs:
      - targets: ['api:3000']
    metrics_path: '/metrics'
```

### Docker Compose with Prometheus

```yaml
# docker-compose.prod.yml
prometheus:
  image: prom/prometheus:latest
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
    - prometheus_data:/prometheus
  command:
    - '--config.file=/etc/prometheus/prometheus.yml'
    - '--storage.tsdb.path=/prometheus'
  ports:
    - "9090:9090"
```

## Prometheus Queries

### Request Rate

```promql
# Requests per second
rate(http_request_total[1m])

# 4xx error rate
rate(http_request_total{status=~"4.."}[5m])

# 5xx error rate
rate(http_request_total{status=~"5.."}[5m])
```

### Request Duration

```promql
# Average request duration
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])

# 95th percentile
histogram_quantile(0.95, http_request_duration_seconds_bucket)

# 99th percentile
histogram_quantile(0.99, http_request_duration_seconds_bucket)
```

### Database Performance

```promql
# Average query duration
rate(db_query_duration_seconds_sum[5m]) / rate(db_query_duration_seconds_count[5m])

# Connection pool usage
db_pool_active_connections / db_pool_max_connections
```

### Queue Metrics

```promql
# Queue size
queue_size{queue="email"}

# Job failure rate
rate(queue_job_failed_total[5m]) / rate(queue_job_added_total[5m])

# Average job duration
rate(queue_job_duration_seconds_sum[5m]) / rate(queue_job_duration_seconds_count[5m])
```

## Grafana Dashboards

### API Dashboard

- Request rate (rps)
- Error rate (4xx, 5xx)
- P50, P95, P99 latency
- Status code distribution

### Database Dashboard

- Connection pool usage
- Query duration histogram
- Transaction duration
- Slow queries

### Queue Dashboard

- Queue size trends
- Job completion rate
- Job failure rate
- Average job duration

### System Dashboard

- CPU usage
- Memory usage
- Event loop lag
- Disk I/O

## Best Practices

### 1. Label Naming

```typescript
// ✅ DO: Consistent naming
http_request_total{method="GET",route="/users",status="200"}

// ❌ DON'T: Inconsistent naming
http_requests{http_method="GET",path="/users",response_code="200"}
```

### 2. Use Histograms for Duration

```typescript
// ✅ DO: Histogram for duration
http_request_duration_seconds

// ❌ DON'T: Counter for duration
http_request_duration_sum  // Don't do this
```

### 3. Cardinality Management

```typescript
// ❌ DON'T: High cardinality labels
http_request_total{user_id="uuid"}  // Too many unique values

// ✅ DO: Low cardinality labels
http_request_total{method="GET",route="/users"}
```

### 4. Bucket Selection

```typescript
// Good buckets for latency
buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
```

### 5. Metrics Naming Convention

```typescript
// Format: metric_name_unit{labels}
http_request_duration_seconds
db_query_duration_milliseconds
cache_hit_total
queue_size
```

## Troubleshooting

### Metrics endpoint 404

**Check:**
- `ENABLE_METRICS=true`
- Metrics module registered
- Controller route correct

### Metrics not updating

**Check:**
- Interceptor registered globally
- Metrics service called
- No exceptions in metrics code

### High cardinality warning

**Solution:**
- Reduce number of labels
- Use predefined label values
- Remove high-cardinality labels

### Prometheus not scraping

**Check:**
- Prometheus configuration
- Target accessible
- Scrape interval configured
- Network connectivity

## Tài liệu liên quan

- [Observability Overview](README.md)
- [Monitoring](monitoring.md)
- [Prometheus Documentation](https://prometheus.io/docs/)
