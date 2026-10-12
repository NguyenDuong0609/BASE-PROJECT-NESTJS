# Troubleshooting Grafana "No Data" Issues

Khi build lại môi trường dev/production và Grafana báo "no data" trong dashboard, hãy kiểm tra theo các bước sau:

## 1. Kiểm tra Data Sources

### Prometheus Data Source

```bash
# Kiểm tra Prometheus có chạy không
curl http://localhost:9090

# Kiểm tra targets
curl http://localhost:9090/api/v1/targets

# Kiểm tra metrics từ API
curl http://localhost:3317/metrics
```

**Expected output:**
- Prometheus status: "up"
- API metrics endpoint: return text format với các metrics

**Grafana Settings:**
- Configuration → Data Sources → Prometheus
- URL: `http://prometheus:9090` (production) hoặc `http://localhost:9090` (local testing)
- Access: Server (default)

### Loki Data Source

```bash
# Kiểm tra Loki có chạy không
curl http://localhost:3100/ready

# Kiểm tra logs
curl http://localhost:3100/loki/api/v1/label/job/values
```

**Grafana Settings:**
- Configuration → Data Sources → Loki
- URL: `http://loki:3100` (production) hoặc `http://localhost:3100` (local testing)
- Access: Server (default)

## 2. Kiểm tra Metrics từ API

```bash
# Kiểm tra API có export metrics không
curl http://localhost:3317/metrics
```

**Nếu metrics không xuất hiện:**
1. Kiểm tra biến môi trường:
   ```env
   ENABLE_METRICS=true
   ```

2. Kiểm tra MetricsModule được import trong AppModule

3. Kiểm tra API container logs:
   ```bash
   docker logs <api-container-name>
   ```

## 3. Kiểm tra Prometheus Scrape Configuration

**File:** `docker-compose.audit.yml`

```yaml
configs:
  prometheus-config:
    content: |
      global:
        scrape_interval: 15s

      scrape_configs:
        - job_name: nestjs-api
          metrics_path: /metrics
          static_configs:
            - targets: ['api:${PORT:-3000}']
```

**Important:**
- `targets` phải khớp với container name và port của API
- Nếu API chạy ở port khác, cập nhật `PORT` env var

## 4. Kiểm tra Alloy Log Collection

**File:** `observability/alloy-config.alloy`

```alloy
// Docker logs discovery
discovery.docker "docker_logs" {
  host = "unix:///var/run/docker.sock"
}

// Scrape logs from Docker containers
loki.source.docker "docker_logs" {
  host = "unix:///var/run/docker.sock"
  targets = discovery.docker.docker_logs.targets
  forward_to = [loki.write.endpoint.receiver]
}

// Loki write endpoint
loki.write "endpoint" {
  endpoint {
    url = "http://loki:3100/loki/api/v1/push"
  }
}
```

**Kiểm tra:**
```bash
# Xem logs của Alloy
docker logs <alloy-container-name>

# Kiểm tra Alloy có kết nối được Loki không
docker exec <alloy-container-name> wget -O- http://loki:3100/ready
```

## 5. Kiểm tra Dashboard Queries

### API Metrics Dashboard

**Problem:** Dashboard queries sai metric names

**Solution:** Cập nhật queries trong dashboard để khớp với actual metrics:

```promql
# HTTP Request Count
http_server_requests_total

# HTTP Request Duration
http_server_request_duration_seconds

# Queue Jobs
app_queue_jobs
```

### Application Logs Dashboard

**Problem:** Container name không khớp

**Solution:** Cập nhật container name trong Loki queries:

```logql
# Đổi thành container name thực tế
{container_name="project_base_nestjs_v3-api-1"}

# Hoặc dùng pattern rộng hơn
{container_name=~".*api.*"}
```

### Database Audit Logs Dashboard

**Problem:** PostgreSQL logs không được thu thập

**Solution:**
1. Kiểm tra pgAudit được enabled trong PostgreSQL:
   ```yaml
   # docker-compose.dev.yml
   postgres_db:
     command:
       - postgres
       - -c
       - shared_preload_libraries=pgaudit
       - -c
       - pgaudit.log=write,ddl,role
   ```

2. Kiểm tra PostgreSQL container name trong queries:
   ```logql
   {container_name="project_base_nestjs_v3-postgres_db-1"}
   ```

## 6. Kiểm tra Network Connectivity

```bash
# Từ Prometheus container, kiểm tra kết nối đến API
docker exec <prometheus-container> wget -O- http://api:3317/metrics

# Từ Grafana container, kiểm tra kết nối đến Prometheus
docker exec <grafana-container> wget -O- http://prometheus:9090/api/v1/targets

# Từ Grafana container, kiểm tra kết nối đến Loki
docker exec <grafana-container> wget -O- http://loki:3100/ready
```

## 7. Common Issues & Solutions

### Issue: Prometheus báo "no data" cho db_pool metrics

**Cause:** Database metrics không được export bởi API

**Solution:** Hiện tại dashboard đã được cập nhật để sử dụng Queue metrics thay vì Database metrics, vì TypeORM không expose database pool metrics một cách dễ dàng.

### Issue: Loki báo "no data" cho logs

**Cause:** Alloy không thu thập được logs từ Docker

**Solution:**
1. Kiểm tra Alpine có mount được `/var/run/docker.sock` không
2. Kiểm tra container logs được output ra stdout
3. Xem logs của Alloy container

### Issue: Dashboard queries không khớp metric names

**Cause:** Metric names trong dashboard khác với actual metrics

**Solution:**
1. Truy cập `http://localhost:3317/metrics` để xem actual metrics
2. Cập nhật dashboard queries để khớp
3. Sử dụng Prometheus UI để test queries: `http://localhost:9090/graph`

## 8. Production-Specific Considerations

### Environment Variables

```env
# Production (.env.prod)
ENABLE_METRICS=true
ENABLE_PGAUDIT=true
LOG_LEVEL=info
LOG_FORMAT=json
```

### Network Isolation

Trong production, Docker network được cấu hình khác nhau. Đảm bảo:
- Grafana có thể kết nối đến Prometheus và Loki
- Prometheus có thể scrape metrics từ API
- Alloy có thể thu thập logs từ các containers

### Security

```yaml
# Không expose ports ra ngoài
services:
  prometheus:
    # KHÔNG có ports mapping

  loki:
    # KHÔNG có ports mapping

  grafana:
    ports:
      - '127.0.0.1:3001:3000'  # Chỉ bind localhost
```

## 9. Verification Checklist

### Before Checking Grafana

- [ ] All containers running: `docker compose ps`
- [ ] API healthy: `curl http://localhost:3317/health/ready`
- [ ] Metrics endpoint accessible: `curl http://localhost:3317/metrics`
- [ ] Prometheus scraping API: `curl http://localhost:9090/api/v1/targets`
- [ ] Loki ready: `curl http://localhost:3100/ready`
- [ ] Alloy running and no errors: `docker logs <alloy-container>`

### In Grafana

- [ ] Data Sources configured correctly
- [ ] Data Sources test successful
- [ ] Dashboard time range selected (default: last 1h)
- [ ] Dashboard queries valid (no red errors)
- [ ] Metric names match actual metrics

## 10. Debugging Commands

```bash
# View all container logs
docker compose logs -f

# View specific service logs
docker logs -f <container-name>

# Check container health
docker compose ps

# Check network
docker network inspect <network-name>

# Test connectivity between containers
docker exec <container-1> ping <container-2>
docker exec <container-1> wget -O- http://<container-2>:<port>
```

## 11. Quick Fix Script

```bash
#!/bin/bash
# Quick fix for common Grafana no-data issues

echo "Checking Prometheus targets..."
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'

echo "Checking API metrics..."
curl -s http://localhost:3317/metrics | head -20

echo "Checking Loki readiness..."
curl -s http://localhost:3100/ready

echo "Checking Alloy logs..."
docker logs $(docker ps -q -f name=alloy) --tail 20

echo "Restarting observability stack..."
docker compose --env-file .env.dev --profile audit-ui \
  -f docker-compose.dev.yml -f docker-compose.audit.yml restart loki alloy prometheus grafana
```

## 12. Dashboard Updates

Các dashboard hiện tại:

1. **API Metrics Dashboard** - Sử dụng `http_server_requests_total`, `http_server_request_duration_seconds` (✅ có sẵn)
2. **Database Metrics Dashboard** - Sử dụng `db_pool_active_connections`, `db_query_duration_seconds` (⚠️ cần thêm DatabaseMetricsService)
3. **Queue Metrics Dashboard** - Sử dụng `app_queue_jobs` (✅ có sẵn)
4. **Application Logs Dashboard** - Sử dụng Loki queries với container names (✅ có sẵn)
5. **Database Audit Logs Dashboard** - Sử dụng Loki queries cho PostgreSQL logs (✅ có sẵn với pgAudit)

### Metrics có sẵn từ API

Các metrics sau đã được export bởi API (`/metrics` endpoint):
- `http_server_requests_total` - HTTP request count
- `http_server_request_duration_seconds` - HTTP request duration histogram
- `app_cache_operations_total` - Cache operations
- `app_queue_jobs` - Queue job counts

### Metrics chưa có

Các metrics sau chưa được export bởi API (Database Metrics Dashboard sẽ báo "no data"):
- `db_pool_active_connections` - Database pool active connections
- `db_pool_idle_connections` - Database pool idle connections
- `db_pool_max_connections` - Database pool max connections
- `db_query_duration_seconds` - Database query duration
- `db_query_total` - Database query count

Để có database metrics, bạn có thể:
1. Sử dụng PostgreSQL exporter
2. Sử dụng database side monitoring tools (pgBadger, pg_stat_statements)
3. Thêm DatabaseMetricsService vào code (file `src/observability/database-metrics.service.ts` đã có sẵn)
