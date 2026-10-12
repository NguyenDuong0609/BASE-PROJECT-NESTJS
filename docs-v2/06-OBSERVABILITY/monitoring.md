# Giám sát & Monitoring

Tài liệu chi tiết về hệ thống giám sát sức khỏe (Health checks), hiệu năng (Metrics), và trực quan hóa (Grafana Dashboards) cho cả môi trường Development và Production.

---

## 1. Tổng quan Kiến trúc Observability

Dự án NestJS Base được trang bị một hệ sinh thái giám sát hoàn chỉnh:

```
┌─────────────────────────────────────────────────────────────┐
│                       Container Host                        │
│                                                             │
│   ┌───────────────┐       Logs        ┌─────────────────┐   │
│   │  NestJS API   │ ────────────────> │  Grafana Alloy  │   │
│   │ (Pino JSON +  │                   │ (Docker socket  │   │
│   │  Audit Events)│                   │  log discovery) │   │
│   └───────┬───────┘                   └────────┬────────┘   │
│           │                                    │            │
│    Scrape │ /metrics                  Push logs│            │
│           ▼                                    ▼            │
│   ┌───────────────┐                   ┌─────────────────┐   │
│   │  Prometheus   │                   │  Grafana Loki   │   │
│   │   (:9090)     │                   │     (:3100)     │   │
│   └───────┬───────┘                   └────────┬────────┘   │
│           │                                    │            │
│           └──────────────┐      ┌──────────────┘            │
│                          ▼      ▼                           │
│                   ┌─────────────────┐                       │
│                   │     Grafana     │                       │
│                   │ (:3001)         │                       │
│                   │ Pre-provisioned │                       │
│                   │ Dashboards      │                       │
│                   └─────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

### Các thành phần chính

| Thành phần | Vai trò | Port (Dev) | Port (Prod) |
|---|---|---|---|
| **NestJS API** | Ứng dụng chính, phát sinh logs (Pino JSON) và metrics | `3317` (Dev .env) | `3000` |
| **Prometheus** | Thu thập và lưu trữ time-series metrics từ `/metrics` và `redis-exporter` | `9090` | Internal |
| **Redis Exporter** | Thu thập metrics RAM, CPU, lệnh Redis và keyspace | `9121` (container) | Internal |
| **RedisInsight** | Web UI trực quan hóa quản lý key, namespace cache và Redis CLI | `5540` | `5540` (profile `redis-ui`) |
| **Grafana Loki** | Lưu trữ và đánh chỉ mục logs từ container stdout | `3100` | Internal |
| **Grafana Alloy** | Docker log collector - đọc container logs, parse JSON, đẩy vào Loki | `12345` | Internal |
| **Grafana** | Giao diện trực quan hóa với 4 dashboards cấu hình sẵn | `3001` | `3001` |

---

## 2. Pre-provisioned Dashboards trong Grafana

Khi khởi động monitoring stack (ở cả Dev và Prod), Grafana **tự động load sẵn 4 dashboards** từ thư mục `observability/grafana/dashboards/`:

### 📊 1. `NestJS API Metrics` (`nestjs-api-metrics.json`)
*Dữ liệu nguồn: Prometheus*
- **Request Rate (req/s)**: Tần suất gọi API theo thời gian thực phân bổ theo HTTP method và path.
- **Latency Percentiles**: Đo lường độ trễ P50, P95, P99 dựa trên histogram `http_server_request_duration_seconds_bucket`.
- **HTTP Error Rate**: Tỷ lệ lỗi 4xx và 5xx.
- **Cache Hit / Miss Ratio**: Thống kê hiệu quả bộ nhớ đệm từ `app_cache_operations_total`.
- **Queue Job Depth**: Độ sâu hàng đợi theo trạng thái (`waiting`, `active`, `failed`...) từ `app_queue_jobs`.
- **Top Slowest Endpoints**: Bảng xếp hạng các endpoint có thời gian phản hồi cao nhất.

### 🔴 2. `Redis & Cache Performance` (`redis-cache-performance.json`)
*Dữ liệu nguồn: Prometheus (kết hợp `redis-exporter` + `nestjs-api /metrics`)*
- **Redis Server Health**:
  - `Redis Uptime`: Thời gian Redis server chạy liên tục.
  - `Connected Clients` / `Blocked Clients`: Số lượng kết nối client hiện tại và các client bị block.
  - `Total Keys`: Tổng số keys trong cơ sở dữ liệu Redis.
  - `Commands/sec`: Tốc độ xử lý lệnh Redis tức thời.
- **💾 Redis Memory (RAM)**:
  - `Used Memory`: Dung lượng RAM Redis đang sử dụng thực tế (`redis_memory_used_bytes`).
  - `Peak Memory`: Ngưỡng RAM đỉnh đã từng đạt tới (`redis_memory_used_peak_bytes`).
  - `Max Memory (Limit)`: Giới hạn RAM tối đa cấu hình (`redis_memory_max_bytes`).
  - `Memory Fragmentation Ratio`: Tỷ lệ phân mảnh bộ nhớ (`redis_mem_fragmentation_ratio`). Lý tưởng từ 1.0 đến 1.5.
  - `Memory Usage Over Time`: Biểu đồ thời gian thực so sánh Used vs RSS vs Peak Memory.
- **⚡ Redis CPU**:
  - `CPU Usage – User vs System`: Tải CPU chia theo User space và Kernel system space (`redis_cpu_user_seconds_total`, `redis_cpu_sys_seconds_total`).
  - `CPU Children (Background Saves)`: Tải CPU khi tiến trình con thực hiện snapshot RDB hoặc AOF rewrite.
- **📊 Application Cache Hit / Miss**:
  - `Overall Cache Hit Rate (%)`: Đồng hồ đo % tỷ lệ cache hit tổng thể của toàn hệ thống dựa trên `app_cache_operations_total`.
  - `Cache Operations Total`: Thống kê tổng số lượt Hits, Misses, Bypasses, Errors.
  - `Cache Hit Rate by Namespace (%)`: Thanh đo % cache hit chi tiết cho từng namespace (`auth`, `users`, `flash-cards`, `collections`, `comments`, `checkin`...).
  - `Cache Operations Rate Over Time`: Xu hướng tốc độ đọc cache Hits/s vs Misses/s vs Bypasses/s.
- **📈 Redis Throughput & Network**:
  - `Commands Processed/sec`: Tần suất lệnh Redis xử lý mỗi giây.
  - `Network I/O`: Băng thông mạng vào (input bytes/s) và ra (output bytes/s).
  - `Redis Keyspace Hit Rate (%)`: Tỷ lệ trúng key ở cấp độ engine Redis (`redis_keyspace_hits_total / (hits + misses)`).
  - `Evicted Keys`: Tốc độ các key bị đẩy ra ngoài do chạm ngưỡng bộ nhớ.

### 📋 3. `NestJS Audit Logs` (`nestjs-audit-logs.json`)
*Dữ liệu nguồn: Loki*
- **Application Audit Events**: Toàn bộ sự kiện audit nghiệp vụ và bảo mật được emit qua structured log với tag `event=audit_event`.
- **Security Audit Events**: Bộ lọc riêng cho các sự kiện nhạy cảm (`AUTH_*`, `ACCOUNT_*`, đổi mật khẩu, đăng nhập sai).
- **PostgreSQL pgAudit Logs**: Giám sát nhật ký câu lệnh DDL/DML cấp cơ sở dữ liệu từ container `postgres_db`.

### 📝 4. `NestJS Pino Application Logs` (`nestjs-pino-logs.json`)
*Dữ liệu nguồn: Loki*
- **All Application Logs**: Xem luồng log thời gian thực với màu sắc phân cấp (trace, debug, info, warn, error, fatal).
- **Log Volume by Level**: Biểu đồ cột thể hiện số lượng log sinh ra theo từng cấp độ.
- **Level Distribution**: Biểu đồ tròn tỷ lệ phần trăm các log level.
- **Application Errors Only**: Panel chuyên dụng lọc riêng các bản ghi lỗi (`level="error"` hoặc `level="fatal"`).
- **Postgres & Redis Infrastructure Logs**: Xem log từ các dịch vụ hạ tầng đi kèm.

---

## 3. Khởi chạy Monitoring

### 3.1. Trong môi trường Development

Có các cách khởi chạy monitoring trong môi trường phát triển:

#### Cách 1: Chạy Full Stack bằng npm scripts (Khuyên dùng)
```bash
# Chạy toàn bộ Dev API + Postgres + Redis + RedisInsight + Full Monitoring Stack:
npm run docker:dev:full

# Hoặc nếu API và DB đang chạy, chỉ bật thêm monitoring stack (Prometheus, Grafana, Loki, Alloy, Redis Exporter):
npm run docker:dev:monitoring

# Nếu chỉ chạy Database + Redis + RedisInsight (phát triển local với `npm run start:dev`):
npm run docker:infra:up
```

#### Cách 2: Sử dụng Docker Compose CLI
```bash
# Khởi động với profile monitoring
docker compose --env-file .env.dev -f docker-compose.dev.yml --profile monitoring up -d
```

#### Truy cập các dịch vụ:
- **Grafana**: [http://localhost:3001](http://localhost:3001)
  - Username: `admin`
  - Password: `admin` (hoặc giá trị trong biến `GRAFANA_ADMIN_PASSWORD`)
  - Dashboards nằm tại menu: **Dashboards -> Browse** (sẵn sàng không cần cấu hình thêm).
- **RedisInsight UI**: [http://localhost:5540](http://localhost:5540)
  - Giao diện quản lý trực quan Redis cache, key browser, TTL inspector và Workbench.
- **Prometheus UI**: [http://localhost:9090](http://localhost:9090)
- **Grafana Alloy UI**: [http://localhost:12345](http://localhost:12345)
- **Loki Status**: [http://localhost:3100/ready](http://localhost:3100/ready)

### 3.2. Trong môi trường Production

Khởi động kết hợp file `docker-compose.prod.yml` và `docker-compose.audit.yml` thông qua profile `audit-ui`:

```bash
docker compose --env-file .env.prod \
  -f docker-compose.prod.yml \
  -f docker-compose.audit.yml \
  --profile audit-ui \
  up -d --build
```

Để dừng stack:
```bash
docker compose --env-file .env.prod \
  -f docker-compose.prod.yml \
  -f docker-compose.audit.yml \
  --profile audit-ui \
  down
```

---

## 4. Cơ chế Cấu hình Tự động (Provisioning)

Hệ thống Grafana sử dụng cơ chế provisioning tiêu chuẩn:

1. **Datasources (`observability/grafana/provisioning/datasources/datasources.yml`)**:
   - Tự động khai báo datasource **Prometheus** trỏ tới `http://prometheus:9090` (mặc định).
   - Tự động khai báo datasource **Loki** trỏ tới `http://loki:3100`.

2. **Dashboards Provider (`observability/grafana/provisioning/dashboards/dashboards.yml`)**:
   - Quét thư mục `/var/lib/grafana/dashboards` mỗi 30 giây.
   - Nạp các file JSON trong thư mục vào Grafana tự động.

3. **Log Shipper (`observability/alloy-config.alloy`)**:
   - Tự động lắng nghe socket Docker (`/var/run/docker.sock`).
   - Gắn nhãn `container_name`, parse định dạng Pino JSON và đẩy vào Loki.

---

## 5. Health Checks Endpoint

Ứng dụng NestJS cung cấp 2 endpoint health check độc lập:

### 5.1. Liveness Probe (`GET /health/live`)
- **Mục đích**: Xác định tiến trình NodeJS còn hoạt động và không bị treo event loop.
- **Response `200 OK`**:
  ```json
  {
    "status": "ok"
  }
  ```

### 5.2. Readiness Probe (`GET /health/ready`)
- **Mục đích**: Xác định ứng dụng đã sẵn sàng tiếp nhận request (kiểm tra kết nối PostgreSQL và Redis).
- **Response `200 OK`**:
  ```json
  {
    "status": "ok",
    "info": {
      "database": { "status": "up" },
      "redis": { "status": "up" }
    }
  }
  ```
- **Response `503 Service Unavailable`** (khi một phụ thuộc gặp sự cố):
  ```json
  {
    "status": "error",
    "error": {
      "database": { "status": "down" }
    }
  }
  ```

---

## 6. Docker Healthcheck Configuration

Cả môi trường Dev và Production đều được cấu hình healthcheck định kỳ cho các container:

```yaml
services:
  api:
    healthcheck:
      test:
        - CMD
        - node
        - -e
        - "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health/ready').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres_db:
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U "$${POSTGRES_USER}" -d "$${POSTGRES_DB}"']
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  redis:
    healthcheck:
      test: ['CMD-SHELL', 'REDISCLI_AUTH="$${REDIS_PASSWORD}" redis-cli ping | grep -q PONG']
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
```

---

## 7. Xử lý sự cố thường gặp (Troubleshooting)

### Dashboard trên Grafana hiển thị "No data"
1. **Kiểm tra cờ ENABLE_METRICS**: Đảm bảo biến `ENABLE_METRICS=true` trong file `.env.dev` hoặc biến môi trường của container `api`.
2. **Kiểm tra Prometheus Target**: Mở `http://localhost:9090/targets` và kiểm tra endpoint `nestjs-api` có trạng thái `UP` không.
3. **Kiểm tra định dạng Log**: Alloy chỉ parse được JSON logs. Đảm bảo container `api` có `LOG_FORMAT=json`.
4. **Kiểm tra quyền truy cập Docker Socket**: Trên Linux, đảm bảo user chạy container Alloy có quyền đọc `/var/run/docker.sock`.

### Prometheus không cào được dữ liệu từ API
Kiểm tra cấu hình target trong file cấu hình Prometheus. Trong Docker network nội bộ, target phải là `api:<port>`, ví dụ `api:3000` (port trong container, không phải port publish ra ngoài máy host).
