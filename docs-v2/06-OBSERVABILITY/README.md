# Observability - Tổng quan

Hệ thống quan sát toàn diện (Full-stack Observability) của NestJS Base, bao gồm Logging, Metrics, Auditing và Grafana Dashboards tự động.

---

## 1. Tổng quan Kiến trúc

Hệ thống cung cấp khả năng quan sát tương đương giữa môi trường **Development** và **Production**:

| Thành phần | Công nghệ | Mục đích |
|---|---|---|
| **Logging** | `nestjs-pino`, Pino | Ghi log JSON có cấu trúc, tự động ẩn thông tin nhạy cảm |
| **Metrics** | In-memory `MetricsRegistry`, Prometheus | Thu thập số lượng requests, độ trễ P50/P95/P99, cache hit rate, queue depth |
| **Redis Exporter** | `oliver006/redis_exporter` | Thu thập metrics hiệu năng Redis (RAM, CPU, Hit/Miss, Commands/s) |
| **RedisInsight** | `redis/redisinsight:2.68` | Web UI trực quan hóa quản lý dữ liệu cache, TTL, keyspace, Workbench CLI |
| **Auditing** | PostgreSQL `audit_events` + Pino event stream | Ghi nhật ký sự kiện nghiệp vụ và an ninh mạng |
| **Database Audit** | PostgreSQL + pgAudit extension | Ghi nhật ký các câu lệnh DDL/DML cấp độ cơ sở dữ liệu |
| **Log Shipper** | Grafana Alloy | Tự động phát hiện Docker containers, parse Pino logs, đẩy về Loki |
| **Log Storage** | Grafana Loki | Lưu trữ và lập chỉ mục nhật ký dạng log streams |
| **Metrics Storage** | Prometheus | Lưu trữ time-series metrics |
| **Visualization** | Grafana | Giao diện hiển thị trực quan với 4 dashboards được nạp sẵn khi khởi động |

---

## 2. Danh mục Pre-provisioned Dashboards

Khi khởi động Docker Compose với profile monitoring (ở Dev hoặc Prod), Grafana tự động nạp sẵn các dashboard sau:

1. **[NestJS API Metrics](metrics.md)**:
   - Request Rate theo thời gian thực (req/s)
   - Độ trễ P50, P95, P99 (Latency percentiles)
   - Tỷ lệ lỗi HTTP 4xx và 5xx
   - Tỷ lệ Cache Hit / Miss
   - Độ sâu hàng đợi Queue Jobs
   - Top các endpoint chậm nhất
2. **[Redis & Cache Performance](redis-cache-monitoring.md)**:
   - Bộ nhớ Redis (RAM): Dung lượng sử dụng, RAM đỉnh (Peak), Tỷ lệ phân mảnh (Fragmentation ratio)
   - Bộ vi xử lý Redis (CPU): Tỷ lệ tải CPU User vs System, Background saves
   - Tỷ lệ % Cache Hit / Miss: Tỷ lệ tổng quát, thống kê theo từng namespace (`auth`, `users`, `flash-cards`...)
   - Thông lượng mạng & Lệnh: Commands/s, Network I/O, Evicted keys, Keyspace hit rate
3. **[NestJS Audit Logs](auditing.md)**:
   - Dòng sự kiện Audit từ ứng dụng
   - Bộ lọc riêng cho Security Audit Events
   - Nhật ký DDL/DML từ pgAudit
4. **[NestJS Pino Application Logs](logging.md)**:
   - Luồng log ứng dụng thời gian thực
   - Phân bổ số lượng log theo từng cấp độ (info, warn, error...)
   - Bảng lọc chuyên biệt cho lỗi ứng dụng (Error / Fatal kèm stack trace)
   - Log hạ tầng từ PostgreSQL và Redis

---

## 3. Khởi chạy Observability

### 3.1. Trong môi trường Development

```bash
# Cách 1: Chạy API + DB + Redis + RedisInsight + Monitoring stack
npm run docker:dev:full

# Cách 2: Bật riêng monitoring stack (nếu API đang chạy local hoặc Docker)
npm run docker:dev:monitoring

# Cách 3: Bật chỉ hạ tầng cơ sở dữ liệu + Redis + RedisInsight (chạy API ngoài Docker)
npm run docker:infra:up

# Cách 4: Lệnh Docker Compose trực tiếp
docker compose --env-file .env.dev -f docker-compose.dev.yml --profile monitoring up -d
```

- **Grafana URL**: [http://localhost:3001](http://localhost:3001) (Tài khoản: `admin` / `admin`)
- **RedisInsight UI**: [http://localhost:5540](http://localhost:5540) (Visual Redis Cache UI)
- **Prometheus URL**: [http://localhost:9090](http://localhost:9090)

### 3.2. Trong môi trường Production

```bash
docker compose --env-file .env.prod \
  -f docker-compose.prod.yml \
  -f docker-compose.audit.yml \
  --profile audit-ui \
  up -d --build
```

---

## 4. Tài liệu chi tiết từng phần

- 🔴 **[Redis & Cache Monitoring](redis-cache-monitoring.md)**: Hướng dẫn sử dụng RedisInsight UI và giám sát RAM, CPU, % Cache Hit/Miss trên Grafana.
- 📊 **[Metrics](metrics.md)**: Định nghĩa chỉ số, PromQL queries, cách tích hợp vào code.
- 📋 **[Auditing](auditing.md)**: Cấu trúc bảng `audit_events`, logic kiểm toán, phân loại an ninh, pgAudit.
- 📝 **[Logging](logging.md)**: Chuẩn cấu trúc JSON Pino, quản lý log levels, bộ thu gom Alloy.
- 🖥️ **[Monitoring](monitoring.md)**: Health checks endpoint, kiến trúc provisioning, checklist triển khai.
