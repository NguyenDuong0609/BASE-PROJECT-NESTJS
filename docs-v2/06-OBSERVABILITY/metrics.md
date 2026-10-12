# Metrics

Hệ thống thu thập và xuất bản time-series metrics định dạng Prometheus trong ứng dụng NestJS.

---

## 1. Tổng quan Kiến trúc

- **Framework**: Lightweight in-memory registry tích hợp sẵn (`MetricsRegistry`), không phụ thuộc thư viện nặng.
- **Endpoint**: `GET /metrics`
- **Feature Flag**: `ENABLE_METRICS=true` (bắt buộc kích hoạt để bật MetricsModule và interceptor).
- **Phạm vi dữ liệu**: Process-local (reset khi tiến trình khởi động lại).
- **Datasource & Dashboard**: Prometheus scrape định kỳ (15s) và hiển thị trực quan trên Grafana qua dashboard `NestJS API Metrics`.

---

## 2. Cấu hình Kích hoạt

### Biến môi trường (`.env.dev` hoặc `.env.prod`)

```env
ENABLE_METRICS=true
```

Khi cờ này bật:
1. `MetricsModule` được import vào `AppModule`.
2. Global `MetricsInterceptor` lắng nghe toàn bộ HTTP requests để tính toán số lượng và độ trễ.
3. Endpoint `GET /metrics` mở công khai cho scraper (Prometheus).

---

## 3. Các loại Metrics trong hệ thống

Dựa trên triển khai thực tế tại [metrics.registry.ts](file:///d:/Project_AI/Project_Base_NestJS_V3/src/observability/metrics.registry.ts):

### 3.1. HTTP Server Requests (`http_server_requests_total`)
- **Loại**: Counter
- **Ý nghĩa**: Đếm tổng số lượng HTTP request đã hoàn thành.
- **Nhãn (Labels)**:
  - `method`: HTTP Method (`GET`, `POST`, `PUT`, `DELETE`...)
  - `path`: URL Route đã normalize (ví dụ `/api/v1/auth/sign-in`)
  - `status`: HTTP Status Code (`200`, `201`, `400`, `401`, `500`...)

**Ví dụ output:**
```promql
# HELP http_server_requests_total Total HTTP requests handled by this process.
# TYPE http_server_requests_total counter
http_server_requests_total{method="GET",path="/health/ready",status="200"} 42
http_server_requests_total{method="POST",path="/auth/sign-in",status="200"} 15
http_server_requests_total{method="POST",path="/auth/sign-in",status="401"} 2
```

### 3.2. HTTP Request Latency (`http_server_request_duration_seconds`)
- **Loại**: Histogram
- **Ý nghĩa**: Phân bổ độ trễ xử lý của các HTTP request theo các ngưỡng thời gian (buckets).
- **Buckets (giây)**: `[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, +Inf]`
- **Dữ liệu xuất bản**:
  - `http_server_request_duration_seconds_bucket{..., le="..."}`: Số lượng request có độ trễ <= `le`.
  - `http_server_request_duration_seconds_sum{...}`: Tổng thời gian (giây) của tất cả request.
  - `http_server_request_duration_seconds_count{...}`: Tổng số lượng request.

**Ví dụ PromQL tính toán:**
```promql
# Tính 95th Percentile Latency (P95) trên toàn bộ hệ thống
histogram_quantile(0.95, sum(rate(http_server_request_duration_seconds_bucket[5m])) by (le))

# Tính 99th Percentile Latency (P99)
histogram_quantile(0.99, sum(rate(http_server_request_duration_seconds_bucket[5m])) by (le))
```

### 3.3. Cache Operations (`app_cache_operations_total`)
- **Loại**: Counter
- **Ý nghĩa**: Thống kê số lượng thao tác đọc ghi bộ nhớ cache Redis.
- **Nhãn (Labels)**:
  - `namespace`: Tên namespace của cache (ví dụ: `auth`, `users`, `flash-cards`)
  - `result`: Kết quả thao tác (`hit`, `miss`, `bypass`, `error`)

**Ví dụ output:**
```promql
# HELP app_cache_operations_total Application cache lookups by namespace and result.
# TYPE app_cache_operations_total counter
app_cache_operations_total{namespace="auth",result="hit"} 120
app_cache_operations_total{namespace="auth",result="miss"} 8
```

**Tính Cache Hit Rate trên Grafana:**
```promql
sum(rate(app_cache_operations_total{result="hit"}[5m]))
/
(sum(rate(app_cache_operations_total{result="hit"}[5m])) + sum(rate(app_cache_operations_total{result="miss"}[5m]))) * 100
```

### 3.4. Queue Jobs (`app_queue_jobs`)
- **Loại**: Gauge
- **Ý nghĩa**: Theo dõi số lượng jobs trong Bull/Redis queue theo từng trạng thái.
- **Nhãn (Labels)**:
  - `queue`: Tên hàng đợi (ví dụ: `email`, `audit`, `notifications`)
  - `state`: Trạng thái job (`waiting`, `active`, `completed`, `failed`, `delayed`)

**Ví dụ output:**
```promql
# HELP app_queue_jobs Queue job counts by queue and state.
# TYPE app_queue_jobs gauge
app_queue_jobs{queue="email",state="waiting"} 3
app_queue_jobs{queue="email",state="active"} 1
app_queue_jobs{queue="email",state="failed"} 0
```

---

## 4. Cách thức thu thập trong Code

### 4.1. MetricsRegistry

Triển khai singleton tại [src/observability/metrics.registry.ts](file:///d:/Project_AI/Project_Base_NestJS_V3/src/observability/metrics.registry.ts):

```typescript
@Injectable()
export class MetricsRegistry {
  recordHttpRequest(method: string, path: string, status: number, durationSeconds: number): void;
  recordCacheOperation(namespace: string, result: 'hit' | 'miss' | 'bypass' | 'error'): void;
  setQueueDepth(queue: string, state: QueueState, count: number): void;
  renderPrometheus(): string;
}
```

### 4.2. Tự động ghi nhận qua Interceptor

[src/observability/metrics.interceptor.ts](file:///d:/Project_AI/Project_Base_NestJS_V3/src/observability/metrics.interceptor.ts) đo thời gian xử lý của mỗi request:

```typescript
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsRegistry) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startedAt = process.hrtime.bigint();
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    return next.handle().pipe(
      finalize(() => {
        const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
        this.metrics.recordHttpRequest(req.method, req.route?.path ?? req.path, res.statusCode, durationSeconds);
      }),
    );
  }
}
```

---

## 5. Cấu hình Prometheus Scrape

Trong `docker-compose.dev.yml` và `docker-compose.audit.yml`, Prometheus được cấu hình scrape như sau:

```yaml
scrape_configs:
  - job_name: nestjs-api
    metrics_path: /metrics
    scrape_interval: 15s
    static_configs:
      - targets: ['api:3000']   # Hostname container trong Docker Network

  - job_name: redis
    scrape_interval: 15s
    static_configs:
      - targets: ['redis-exporter:9121']   # Redis Exporter container
```

---

## 6. Pre-configured Grafana Dashboards

Dự án đã dựng sẵn 2 file dashboard metrics chính tại thư mục `observability/grafana/dashboards/`:

### 📊 1. [NestJS API Metrics](file:///d:/Project_AI/Project_Base_NestJS_V3/observability/grafana/dashboards/nestjs-api-metrics.json)
Khi Grafana khởi động, dashboard sẽ tự động có mặt tại:
- **Tên Dashboard**: `NestJS API Metrics`
- **Các Panels bao gồm**:
  1. **Request Rate (req/s)**: `sum(rate(http_server_requests_total[1m])) by (method, path)`
  2. **Latency P50, P95, P99**: Histogram percentile thời gian phản hồi
  3. **HTTP 4xx / 5xx Error Rate**: Tỷ lệ lỗi so với tổng số requests
  4. **Cache Hit Rate (%)**: Tỷ lệ cache trúng/trượt
  5. **Queue Depth**: Số lượng job đang chờ hoặc gặp lỗi
  6. **Top Slowest Endpoints**: Bảng thống kê đường dẫn chậm nhất

### 🔴 2. [Redis & Cache Performance](file:///d:/Project_AI/Project_Base_NestJS_V3/observability/grafana/dashboards/redis-cache-performance.json)
*(Xem hướng dẫn sử dụng chi tiết tại [redis-cache-monitoring.md](file:///d:/Project_AI/Project_Base_NestJS_V3/docs-v2/06-OBSERVABILITY/redis-cache-monitoring.md))*
- **Tên Dashboard**: `Redis & Cache Performance`
- **Các Panels bao gồm**:
  1. **Redis Server Health**: Uptime, Connected Clients, Total Keys, Commands/sec
  2. **💾 Redis Memory (RAM)**: `redis_memory_used_bytes`, `redis_memory_used_peak_bytes`, `redis_memory_max_bytes`, `redis_mem_fragmentation_ratio`
  3. **⚡ Redis CPU**: User CPU vs System CPU (`redis_cpu_user_seconds_total`, `redis_cpu_sys_seconds_total`), Background saves
  4. **📊 Application Cache Hit / Miss**: Overall Hit Rate (%), Thống kê Hit/Miss/Bypass/Error, Tỷ lệ theo từng namespace, Xu hướng thời gian thực
  5. **📈 Redis Throughput & Network**: Network I/O (Bps), Keyspace Hit Rate (%), Evicted keys, Connection rates

