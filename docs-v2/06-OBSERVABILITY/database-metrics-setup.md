# Database Metrics Setup

Đã thêm DatabaseMetricsService để export database connection pool metrics cho Grafana.

## Những gì đã thay đổi

### 1. Tạo file mới
- `src/observability/database-metrics.service.ts` - Service thu thập database pool metrics

### 2. Cập nhật files
- `src/observability/metrics.module.ts` - Import và register DatabaseMetricsService
- `src/observability/metrics.registry.ts` - Thêm method `setDbPoolMetrics()` và export database metrics

### 3. Metrics mới được export
```
db_pool_active_connections - Số connection đang active
db_pool_idle_connections - Số connection đang idle
db_pool_max_connections - Số connection tối đa
db_pool_waiting_connections - Số client đang chờ connection
```

## Cách kiểm tra sau khi rebuild

### 1. Build và restart API
```bash
# Build Docker image
docker compose --env-file .env.dev -f docker-compose.dev.yml build api

# Restart API container
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d api
```

### 2. Kiểm tra API health
```bash
# Chờ khoảng 30-60 giây để API khởi động
curl http://localhost:3317/health/ready
```

### 3. Kiểm tra metrics endpoint
```bash
curl http://localhost:3317/metrics
```

Expected output nên bao gồm:
```
# HELP db_pool_active_connections Number of active database connections.
# TYPE db_pool_active_connections gauge
db_pool_active_connections X

# HELP db_pool_idle_connections Number of idle database connections.
# TYPE db_pool_idle_connections gauge
db_pool_idle_connections Y

# HELP db_pool_max_connections Maximum number of database connections.
# TYPE db_pool_max_connections gauge
db_pool_max_connections Z

# HELP db_pool_waiting_connections Number of clients waiting for a database connection.
# TYPE db_pool_waiting_connections gauge
db_pool_waiting_connections W
```

### 4. Kiểm tra Prometheus
```bash
# Verify Prometheus đang scrape metrics
curl http://localhost:9090/api/v1/targets

# Test query trong Prometheus UI
# Mở http://localhost:9090/graph
# Query: db_pool_active_connections
```

### 5. Kiểm tra Grafana Dashboard
- Mở Grafana: http://localhost:3001
- Vào Database Metrics Dashboard
- Các panel nên hiển thị data (không còn "no data")

## Troubleshooting

### API không khởi động (stuck ở compilation)

Nếu API container không khởi động được:

**Option 1: Chạy local thay vì Docker**
```bash
# Stop Docker API
docker compose --env-file .env.dev -f docker-compose.dev.yml stop api

# Chạy local (cần PostgreSQL và Redis vẫn chạy trong Docker)
npm run start:dev
```

**Option 2: Kiểm tra logs**
```bash
docker logs project_base_nestjs_v3-api-1 --tail 100
```

**Option 3: Kiểm tra build errors**
```bash
# Build local để xem errors
npm run build
```

### Database metrics vẫn không xuất hiện

Nếu metrics không xuất hiện trong `/metrics` endpoint:

1. **Kiểm tra DatabaseMetricsService có được khởi tạo không**
```bash
docker logs project_base_nestjs_v3-api-1 | grep "Database metrics"
```

Expected: `Database metrics collection started`

2. **Kiểm tra có lỗi không**
```bash
docker logs project_base_nestjs_v3-api-1 | grep -i "error\|failed"
```

3. **TypeORM pool structure có thể khác**
- DatabaseMetricsService sử dụng `@ts-ignore` để truy cập TypeORM internal properties
- Nếu TypeORM version khác, structure có thể thay đổi
- Cần adjust code theo TypeORM version hiện tại

### Prometheus không scrape được metrics

1. **Kiểm scrape config trong docker-compose.audit.yml**
```yaml
scrape_configs:
  - job_name: nestjs-api
    metrics_path: /metrics
    static_configs:
      - targets: ['api:${PORT:-3000}']  # Đảm bảo port khớp
```

2. **Kiểm tra API port trong .env.dev**
```env
PORT=3317
```

3. **Test connectivity từ Prometheus container**
```bash
docker exec project_base_nestjs_v3-prometheus-1 wget -O- http://api:3317/metrics
```

## Dashboard Queries sau khi có metrics

### Database Metrics Dashboard

Khi metrics có sẵn, các queries sau sẽ hoạt động:

```promql
# Connection Pool
db_pool_active_connections
db_pool_idle_connections

# Pool Usage
db_pool_active_connections / db_pool_max_connections

# Query Duration (cần thêm DB query tracking)
rate(db_query_duration_seconds_sum[5m]) / rate(db_query_duration_seconds_count[5m])

# Query Rate (cần thêm DB query tracking)
rate(db_query_total[5m])
```

**Lưu ý:** Query duration và query rate metrics cần thêm logic tracking riêng trong code. Hiện tại chỉ có connection pool metrics.

## Production Deployment

### Environment Variables
```env
# .env.prod
ENABLE_METRICS=true
DB_POOL_SIZE=20  # hoặc giá trị production phù hợp
```

### Monitoring
- Theo dõi `db_pool_active_connections / db_pool_max_connections` ratio
- Nếu ratio > 0.9: Cần tăng pool size
- Nếu ratio < 0.3: Có thể giảm pool size để tiết kiệm resources

### Alerts (thêm vào Prometheus)
```yaml
- alert: HighDatabasePoolUsage
  expr: db_pool_active_connections / db_pool_max_connections > 0.9
  for: 5m
  annotations:
    summary: "Database connection pool nearly exhausted"

- alert: DatabasePoolExhausted
  expr: db_pool_waiting_connections > 5
  for: 5m
  annotations:
    summary: "Clients waiting for database connections"
```

## Dashboard Updates

Đã có 5 dashboard trong Grafana:

1. **API Metrics** - HTTP request metrics (✅ hoạt động)
2. **Database Metrics** - Database pool metrics (✅ đã enable)
3. **Queue Metrics** - Queue job metrics (✅ hoạt động)
4. **Application Logs** - API logs via Loki (✅ hoạt động)
5. **Database Audit Logs** - PostgreSQL audit logs via Loki (✅ hoạt động với pgAudit)

## Next Steps (Optional)

Nếu cần thêm database query metrics:

1. Thêm TypeORM query interceptor để track query duration
2. Tạo metrics cho:
   - `db_query_duration_seconds` - Histogram query duration
   - `db_query_total` - Counter query count
3. Cập nhật dashboard để hiển thị query performance

## Files đã thêm/cập nhật

### Thêm mới
- `src/observability/database-metrics.service.ts`

### Cập nhật
- `src/observability/metrics.module.ts`
- `src/observability/metrics.registry.ts`

### Dashboard
- `observability/grafana/dashboards/database-metrics.json` (đã có, giờ sẽ có data)
- `observability/grafana/dashboards/queue-metrics.json` (thêm mới)
