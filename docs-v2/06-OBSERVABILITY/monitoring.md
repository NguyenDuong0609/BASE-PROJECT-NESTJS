# Monitoring

Giám sát health, performance và availability của hệ thống.

## Tổng quan

Monitoring bao gồm:

- **Health Checks** - Liveness và readiness
- **Dependency Checks** - PostgreSQL, Redis
- **Docker Healthcheck** - Container health
- **Alerting** - Thông báo khi có vấn đề
- **Dashboard** - Grafana visualization

## Health Checks

### Liveness Check

**Endpoint:** `GET /health/live`

**Purpose:** Kiểm tra process có đang chạy không

**Response 200:**
```json
{
  "status": "ok"
}
```

**Response 503:**
```json
{
  "status": "error"
}
```

### Readiness Check

**Endpoint:** `GET /health/ready`

**Purpose:** Kiểm tra dependencies (PostgreSQL, Redis)

**Response 200:**
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    },
    "redis": {
      "status": "up"
    }
  }
}
```

**Response 503:**
```json
{
  "status": "error",
  "error": {
    "database": {
      "status": "down"
    },
    "redis": {
      "status": "up"
    }
  }
}
```

## Health Check Implementation

### Health Controller

```typescript
// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { HealthCheckResult } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  health() {
    return this.health.check([
      async () => ({
        database: await this.db.pingCheck('database'),
      }),
    ]);
  }

  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      async () => ({
        database: await this.db.pingCheck('database'),
      }),
      async () => ({
        redis: await this.redis.pingCheck(),
      }),
    ]);
  }
}
```

### Database Health Indicator

```typescript
// TypeOrmHealthIndicator checks connection
// Redis health indicator needs custom implementation
```

## Docker Healthcheck

### API Container

```yaml
# docker-compose.prod.yml
api:
  healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health/ready"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### PostgreSQL Container

```yaml
postgres_db:
  healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ${DB_USERNAME}"]
  interval: 10s
  timeout: 5s
  retries: 5
```

### Redis Container

```yaml
redis:
  healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 10s
  timeout: 5s
  retries: 5
```

## Monitoring Stack

### Grafana + Loki + Prometheus

**docker-compose.audit.yml:**

```yaml
version: '3.8'

services:
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

  loki:
  image: grafana/loki:latest
  volumes:
    - loki_data:/loki
  ports:
    - "3100:3100"

  grafana:
  image: grafana/grafana:latest
  environment:
    - GF_SECURITY_ADMIN_USER=${GRAFANA_ADMIN_USER}
    - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
  volumes:
    - grafana_data:/var/lib/grafana
  ports:
    - "3001:3000"

volumes:
  prometheus_data:
  loki_data:
  grafana_data:
```

**Enable:**
```bash
docker compose --env-file .env.prod --profile audit-ui \
  -f docker-compose.prod.yml -f docker-compose.audit.yml up -d
```

## Grafana Dashboards

### Key Metrics to Monitor

**API Performance:**
- Request rate (rps)
- Error rate (4xx, 5xx)
- P50, P95, P99 latency
- Request duration histogram

**Database:**
- Connection pool usage
- Query duration
- Slow queries
- Transaction duration

**Queue:**
- Queue size
- Job completion rate
- Job failure rate
- Job duration

**System:**
- CPU usage
- Memory usage
- Disk I/O
- Network I/O

### Alerting Rules

```yaml
# Prometheus alert rules
groups:
  - name: api_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_request_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"

      - alert: HighLatency
        expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 1
        for: 5m
        annotations:
          summary: "95th percentile latency > 1s"

      - alert: DatabasePoolExhausted
        expr: db_pool_active_connections / db_pool_max_connections > 0.9
        for: 5m
        annotations:
          summary: "Database connection pool nearly exhausted"

      - alert: QueueBacklog
        expr: queue_size{queue="email"} > 1000
        for: 10m
        annotations:
          summary: "Email queue backlog detected"
```

## Uptime Monitoring

### External Monitoring Services

**Uptime Robot:**
- Monitor `/health/ready`
- Alert on downtime
- Configure check intervals

**Pingdom:**
- Similar to Uptime Robot
- Multi-region checks
- SMS alerts

**Datadog/New Relic:**
- Full APM
- Infrastructure monitoring
- Log aggregation

## Local Health Checks

### Using curl

```bash
# Liveness
curl http://localhost:3000/health/live

# Readiness
curl http://localhost:3000/health/ready

# With verbose
curl -v http://localhost:3000/health/ready
```

### Using wget

```bash
wget -O- http://localhost:3000/health/ready
```

## Monitoring Checklist

### Pre-Deployment

- [ ] Health check endpoints documented
- [ ] Health check dependencies defined
- [ ] Alert thresholds configured
- [ ] Dashboard created
- [ ] Notification channels set up

### Post-Deployment

- [ ] Health checks passing
- [ ] Metrics being collected
- [ ] Prometheus scraping
- [ ] Grafana dashboards populating
- [ ] Alerts tested

### Ongoing

- [ ] Monitor error rates
- [ ] Monitor latency trends
- [ ] Monitor resource usage
- [ ] Review alerts regularly
- [ ] Update dashboards as needed

## Best Practices

### 1. Meaningful Health Checks

```typescript
// ✅ DO: Check actual dependencies
@Get('ready')
async ready() {
  return this.health.check([
    async () => this.db.pingCheck(),
    async () => this.redis.pingCheck(),
  ]);
}

// ❌ DON'T: Always return success
@Get('ready')
async ready() {
  return { status: 'ok' };  // Always true!
}
```

### 2. Separate Liveness and Readiness

- **Liveness**: Process alive
- **Readiness**: Dependencies available

Container can be alive but not ready to serve traffic.

### 3. Appropriate Check Intervals

```yaml
# API container
interval: 30s
timeout: 10s
retries: 3

# Database container
interval: 10s
timeout: 5s
retries: 5
```

### 4. Start Period

```yaml
start_period: 40s  # Give time to start up
```

### 5. Degrade Gracefully

```typescript
// Return degraded status instead of failing
if (redisDown) {
  return {
    status: 'degraded',
    info: {
      database: { status: 'up' },
      redis: { status: 'down' },
    },
  };
}
```

## Troubleshooting

### Health check failing

**Check:**
- Database connection
- Redis connection
- Network connectivity
- Configuration correct

### Metrics not showing

**Check:**
- Prometheus scraping
- Metrics endpoint accessible
- Interceptor registered
- Feature flag enabled

### Alerts not firing

**Check:**
- Alert rules configured
- Evaluation interval
- Notification channels
- Alert thresholds

### Dashboard empty

**Check:**
- Data source configured
- Queries correct
- Time range selected
- PromQL syntax

## Tài liệu liên quan

- [Observability Overview](README.md)
- [Metrics](metrics.md)
- [Logging](logging.md)
- [Auditing](auditing.md)
