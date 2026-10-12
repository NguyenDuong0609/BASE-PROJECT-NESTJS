# Hướng dẫn Giám sát Redis & Cache (RedisInsight & Grafana)

Tài liệu hướng dẫn chi tiết cách sử dụng **RedisInsight Web UI** để trực quan hóa dữ liệu cache và sử dụng **Grafana Dashboard** để giám sát **RAM, CPU, % Cache Hit/Miss** cho dự án NestJS Base.

---

## 1. Tổng quan Kiến trúc Giám sát Cache

Hệ thống cung cấp 2 công cụ trực quan hóa bổ trợ lẫn nhau:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NestJS Caching Ecosystem                        │
│                                                                        │
│   ┌────────────────────┐                 ┌─────────────────────────┐   │
│   │     NestJS API     │ ── Set / Get ──>│          Redis          │   │
│   │ (AppCacheService)  │                 │         (:6379)         │   │
│   └─────────┬──────────┘                 └───────┬─────────┬───────┘   │
│             │                                    │         │           │
│   Hit/Miss/Bypass metrics               Scrape metrics  Direct Connect │
│             │                                    │         │           │
│             ▼                                    ▼         ▼           │
│      GET /metrics                        Redis Exporter  RedisInsight  │
│             │                               (:9121)       UI (:5540)   │
│             └──────────────┐      ┌──────────────┘                     │
│                            ▼      ▼                                    │
│                     ┌─────────────────┐                                │
│                     │   Prometheus    │                                │
│                     │     (:9090)     │                                │
│                     └────────┬────────┘                                │
│                              │                                         │
│                              ▼                                         │
│                     ┌─────────────────┐                                │
│                     │     Grafana     │                                │
│                     │     (:3001)     │                                │
│                     │  Redis & Cache  │                                │
│                     │   Performance   │                                │
│                     └─────────────────┘                                │
└────────────────────────────────────────────────────────────────────────┘
```

| Công cụ | Mục đích | Địa chỉ truy cập |
|---|---|---|
| **RedisInsight** | Trực quan hóa dữ liệu key-value, kiểm tra TTL, xem payload JSON, thao tác xóa/invalidation và chạy CLI Workbench | [http://localhost:5540](http://localhost:5540) |
| **Grafana Dashboard** | Giám sát hiệu năng hệ thống: đo RAM tiêu thụ, CPU tải thực tế, và tỷ lệ phần trăm **% Cache Hit/Miss** theo namespace | [http://localhost:3001](http://localhost:3001) |

---

## 2. Hướng dẫn Khởi chạy Hệ thống

### 2.1. Trong môi trường Development (Docker Full Stack)
Khởi chạy toàn bộ ứng dụng cùng Redis, RedisInsight và stack Monitoring (Prometheus, Grafana, Loki, Alloy, Redis Exporter):

```bash
# Cách 1: Npm script (Khuyên dùng)
npm run docker:dev:full

# Cách 2: Docker Compose trực tiếp
docker compose --env-file .env.dev -f docker-compose.dev.yml --profile monitoring up -d
```

### 2.2. Khi chạy ứng dụng NestJS ngoài Docker (Local Machine)
Nếu bạn chạy NestJS API trên máy host (`npm run start:dev`) nhưng muốn cơ sở dữ liệu, Redis và RedisInsight chạy trên Docker:

```bash
# Bật Postgres + Redis + RedisInsight:
npm run docker:infra:up

# Khi cần dừng hạ tầng:
npm run docker:infra:down
```

### 2.3. Trong môi trường Production / Audit
RedisInsight được kích hoạt thông qua profile `redis-ui`, trong khi `redis-exporter` chạy kèm profile `audit-ui`:

```bash
docker compose --env-file .env.prod \
  -f docker-compose.prod.yml \
  -f docker-compose.audit.yml \
  --profile audit-ui \
  --profile redis-ui \
  up -d
```

---

## 3. Chức năng 1: Sử dụng RedisInsight Web UI

**RedisInsight** là giao diện đồ họa chính thức từ Redis giúp quản lý bộ nhớ đệm mà không cần dùng dòng lệnh terminal thô sơ.

### 3.1. Kết nối vào Redis Database

1. Mở trình duyệt và truy cập: **[http://localhost:5540](http://localhost:5540)**
2. Khi mở lần đầu, đồng ý các điều khoản sử dụng (Terms & Privacy).
3. Nhấn nút **"Add Redis Database"** (hoặc icon dấu `+`).
4. Điền thông số kết nối:
   - **Host**: `redis` *(khi chạy trong Docker network)* hoặc `localhost` / `127.0.0.1` *(nếu RedisInsight cài ngoài host)*
   - **Port**: `6379`
   - **Database Alias (Tên gợi nhớ)**: `NestJS Dev Cache`
   - **Username**: *(để trống)*
   - **Password**: *(nhập giá trị `REDIS_PASSWORD` trong file `.env.dev` nếu có cấu hình mật khẩu, nếu không để trống)*
5. Nhấn **"Add Redis Database"**.
6. Chọn database vừa tạo để truy cập vào màn hình quản trị.

### 3.2. Quản lý và Khám phá Keys (Browser)

Trong menu bên trái, chọn biểu tượng **Browser** (hoặc mục **Key Details**):
- **Phân cấp Namespace theo dấu 2 chấm (`:`)**:
  RedisInsight tự động gom nhóm các key dạng cây thư mục:
  - `auth:*` : Token đen (Blacklist token), phiên đăng nhập, OTP.
  - `users:*` : Hồ sơ người dùng cache (`users:profile:123`, `users:list:...`).
  - `flash-cards:*` : Thẻ học từ vựng, danh sách thẻ theo bộ sưu tập.
  - `collections:*` : Bộ sưu tập flashcard.
  - `comments:*` : Bình luận bài viết, checkin.
  - `checkin:*` : Lịch sử điểm danh / check-in.
  - `permissions:*` : Quyền hạn và RBAC.

- **Xem chi tiết Key**:
  - Nhấp vào bất kỳ key nào để xem:
    - **Data Type**: `string`, `hash`, `set`, `zset`...
    - **TTL (Time-To-Live)**: Thời gian sống còn lại tính bằng giây (đếm ngược thời gian thực). Nếu hiển thị `No limit` tức là key vĩnh viễn.
    - **Memory size**: Dung lượng byte key đang chiếm giữ trong RAM.
    - **Value**: Dữ liệu JSON nguyên bản được parse tự động (có thể xem dạng JSON Tree hoặc Raw Text).

- **Thao tác nhanh**:
  - **Edit Value**: Sửa trực tiếp giá trị cache để kiểm thử trường hợp dữ liệu thay đổi.
  - **Set Expiry / Refresh TTL**: Thay đổi thời gian hết hạn của cache.
  - **Delete Key**: Xóa thủ công 1 key để buộc API truy vấn lại database (Test Cache Invalidation).
  - **Filter / Search**: Nhập pattern như `flash-cards:*` vào ô tìm kiếm để lọc riêng các key quan tâm.

### 3.3. Sử dụng Redis Workbench (CLI tích hợp)

Tại menu bên trái, chọn biểu tượng **Workbench**:
- Cung cấp giao diện chạy lệnh Redis có gợi ý cú pháp (IntelliSense).
- Các lệnh hữu ích thường dùng:
  ```redis
  # Đếm tổng số keys
  DBSIZE

  # Kiểm tra thời gian sống của một key
  TTL users:profile:1

  # Xem thông tin bộ nhớ chi tiết
  INFO memory

  # Xem thông tin CPU
  INFO cpu

  # Tìm các key theo tiền tố (Khuyến cáo dùng SCAN trên production)
  SCAN 0 MATCH "flash-cards:*" COUNT 100
  ```

---

## 4. Chức năng 2: Giám sát RAM, CPU, % Cache Hit/Miss trên Grafana

**Grafana Dashboard: `Redis & Cache Performance`** được nạp tự động (Auto-provisioned) khi khởi động monitoring stack, lấy dữ liệu thời gian thực từ **Prometheus** (qua `redis-exporter` và `NestJS API /metrics`).

### 4.1. Truy cập Dashboard

1. Mở trình duyệt và truy cập: **[http://localhost:3001](http://localhost:3001)**
2. Đăng nhập:
   - **Tài khoản**: `admin`
   - **Mật khẩu**: `admin` (hoặc giá trị cấu hình trong `GRAFANA_ADMIN_PASSWORD`)
3. Vào menu bên trái: **Dashboards -> Browse**.
4. Chọn dashboard: **`Redis & Cache Performance`** (hoặc truy cập trực tiếp qua URL `http://localhost:3001/d/redis-cache-performance`).

---

### 4.2. Giám sát Bộ nhớ Redis (RAM)

Hàng ngang **"💾 Redis Memory (RAM)"** cung cấp các chỉ số quan trọng:

| Panel | Chỉ số PromQL | Ý nghĩa & Hướng dẫn đánh giá |
|---|---|---|
| **Used Memory** | `redis_memory_used_bytes` | Dung lượng RAM thực tế mà dữ liệu và bộ đệm Redis đang tiêu thụ. Được tô màu xanh lá (< 256MB), vàng (256MB - 512MB), đỏ (> 512MB). |
| **Peak Memory** | `redis_memory_used_peak_bytes` | Đỉnh RAM cao nhất Redis từng chạm tới kể từ lúc khởi động. Giúp dự phòng dung lượng bộ nhớ vật lý. |
| **Max Memory (Limit)** | `redis_memory_max_bytes` | Hạn mức RAM tối đa cho phép gán cho Redis server (`maxmemory` trong redis.conf). Nếu chưa đặt hạn mức sẽ hiển thị *"No limit set"*. |
| **Memory Fragmentation Ratio** | `redis_mem_fragmentation_ratio` | **Tỷ lệ phân mảnh bộ nhớ** (`RSS Memory / Used Memory`):<br>• **1.0 - 1.5**: Trạng thái lý tưởng, bộ nhớ được tối ưu.<br>• **> 1.5**: Phân mảnh bộ nhớ, hệ điều hành cấp nhiều RAM hơn mức Redis thực dùng.<br>• **< 1.0**: Redis bắt đầu bị swap sang đĩa cứng, cần nâng cấp RAM máy chủ ngay. |
| **Memory Usage Over Time** | `redis_memory_used_bytes`, `redis_memory_used_rss_bytes`, `redis_memory_used_peak_bytes` | Biểu đồ chuỗi thời gian so sánh Used, RSS và Peak Memory. Giúp phát hiện **Memory Leak** (nếu đường Used Memory tăng đều đặn mà không giảm). |

---

### 4.3. Giám sát Bộ vi xử lý Redis (CPU)

Hàng ngang **"⚡ Redis CPU"** theo dõi mức độ tải của engine đơn luồng Redis:

| Panel | Chỉ số PromQL | Ý nghĩa & Hướng dẫn đánh giá |
|---|---|---|
| **CPU Usage – User vs System** | `rate(redis_cpu_user_seconds_total[1m])`<br>`rate(redis_cpu_sys_seconds_total[1m])` | Đo tỷ lệ phần trăm thời gian CPU mà tiến trình chính của Redis xử lý:<br>• **User CPU**: Thời gian thực thi lệnh của người dùng (GET, SET, HGETALL...).<br>• **System CPU**: Thời gian xử lý mạng, cấp phát bộ nhớ (I/O syscalls).<br>• *Cảnh báo*: Nếu User CPU tăng vọt 100%, có lệnh nặng (như `KEYS *` trên DB lớn) đang làm block event loop của Redis. |
| **CPU Children (Background Saves)** | `rate(redis_cpu_user_children_seconds_total[1m])`<br>`rate(redis_cpu_sys_children_seconds_total[1m])` | Đo tải CPU của các tiến trình con do Redis rẽ nhánh (`fork`) khi thực hiện snapshot sao lưu RDB hoặc AOF rewrite. |

---

### 4.4. Giám sát Tỷ lệ % Cache Hit / Miss

Hàng ngang **"📊 Application Cache Hit / Miss"** phản ánh hiệu quả thực sự của tầng bộ nhớ đệm đối với trải nghiệm người dùng và tải cơ sở dữ liệu:

#### 1. Overall Cache Hit Rate (%) - Đồng hồ đo tỷ lệ trúng Cache
- **Công thức tính toán:**
  $$\text{Hit Rate} = \frac{\text{Hits}}{\text{Hits} + \text{Misses}} \times 100\%$$
- **PromQL:**
  ```promql
  sum(rate(app_cache_operations_total{result="hit"}[5m]))
  /
  (sum(rate(app_cache_operations_total{result="hit"}[5m])) + sum(rate(app_cache_operations_total{result="miss"}[5m])))
  ```
- **Thang đánh giá hiệu quả:**
  - 🟢 **85% - 100%**: Tuyệt vời. Phần lớn các truy vấn được giải quyết tức thì từ RAM, tải trên PostgreSQL rất thấp.
  - 🟡 **70% - 84%**: Bình thường. Cần kiểm tra xem có thể tăng TTL hoặc bổ sung cache cho các endpoint đọc nhiều.
  - 🟠 **50% - 69%**: Kém. Cache đang bị miss nhiều hoặc TTL quá ngắn khiến dữ liệu vừa nạp đã hết hạn.
  - 🔴 **< 50%**: Rất kém. Cần rà soát lại chiến lược caching hoặc cơ chế cache invalidation bị xóa quá mức cần thiết.

#### 2. Cache Operations Total (All Time)
- Thống kê dạng thẻ số:
  - 🟢 **Hits**: Số lần tìm thấy dữ liệu trong Redis cache thành công.
  - 🟡 **Misses**: Số lần không tìm thấy key trong cache (phải truy vấn Postgres và set lại vào cache).
  - 🔵 **Bypasses**: Số lần bỏ qua cache (khi `ENABLE_REDIS_CACHE=false` hoặc caller chủ động tắt).
  - 🔴 **Errors**: Số lần xảy ra ngoại lệ Redis (mất kết nối, timeout).

#### 3. Cache Hit Rate by Namespace (%) - So sánh hiệu quả theo từng Module
- Hiển thị dạng thanh đo Bar Gauge nằm ngang cho từng module:
  - `auth`: Thường đạt > 90% (Blacklist token, phân quyền).
  - `users`: Thường đạt > 85% (Thông tin hồ sơ ít thay đổi).
  - `flash-cards` / `collections`: Theo dõi hành vi học tập và tải thẻ.
  - `comments`: Thường có tỷ lệ miss cao hơn do cập nhật liên tục.

#### 4. Cache Operations Rate Over Time (Hits/s vs Misses/s)
- Biểu đồ đường thời gian thực thể hiện lưu lượng truy vấn cache mỗi giây.
- Giúp bạn quan sát thấy ngay hiệu quả khi chạy Load Test: đường màu xanh (Hits/s) tăng cao trong khi đường màu cam (Misses/s) giữ mức thấp chứng minh hệ thống đang chịu tải tốt nhờ cache.

#### 5. Redis Keyspace Hit Rate (%)
- Đo tỷ lệ trúng key ở cấp độ toàn bộ máy chủ Redis (`redis_keyspace_hits_total` / `(hits + misses)`).

---

## 5. Hướng dẫn Kịch bản Kiểm thử Thực tế

Để kiểm chứng hai chức năng hoạt động đúng, bạn có thể thực hiện theo quy trình sau:

### Bước 1: Gửi request đọc dữ liệu để sinh ra Cache Miss đầu tiên
1. Gửi request lấy thông tin một tài nguyên (ví dụ: `GET /api/v1/flash-cards` hoặc `GET /api/v1/users/profile`).
2. Do lần đầu tiên chưa có trong cache, ứng dụng đọc từ PostgreSQL và ghi vào Redis cache.
3. Quan sát:
   - Trên **Grafana**: Số `Misses` tăng lên 1.
   - Trên **RedisInsight**: Xuất hiện key mới dưới namespace `flash-cards:*` hoặc `users:*` kèm theo bộ đếm TTL (ví dụ 300s).

### Bước 2: Gửi request lặp lại để sinh ra Cache Hit
1. Gửi lại chính xác request trên thêm 5-10 lần.
2. Ứng dụng đọc trực tiếp từ Redis trong < 2ms mà không chạm vào Postgres.
3. Quan sát:
   - Trên **Grafana**: Số `Hits` tăng lên, thước đo `Overall Cache Hit Rate (%)` tăng vọt lên **80% - 90%**.
   - Biểu đồ `Commands Processed/sec` trên Grafana tăng lên tương ứng.

### Bước 3: Thử nghiệm xóa key trên RedisInsight để test Invalidation
1. Vào **RedisInsight -> Browser**, tìm key của tài nguyên vừa gọi.
2. Nhấn biểu tượng thùng rác **Delete Key**.
3. Quay lại gửi request API một lần nữa.
4. Quan sát:
   - Request lần này lại trở thành `Cache Miss`, sau đó key tự động được tạo mới trên RedisInsight với TTL mới.
   - Thể hiện tính chính xác và nhất quán giữa giao diện RedisInsight và các chỉ số trên Grafana!

---

## 6. Xử lý Sự cố Thường gặp

| Triệu chứng | Nguyên nhân có thể | Cách khắc phục |
|---|---|---|
| **RedisInsight không kết nối được vào Redis** | Host name sai khi chạy trong Docker | Nhập `Host: redis` thay vì `localhost`. Nếu Redis có đặt mật khẩu, nhập đúng giá trị `REDIS_PASSWORD` từ `.env.dev`. |
| **Grafana panel RAM / CPU hiển thị "No Data"** | Container `redis-exporter` chưa khởi động | Kiểm tra lệnh khởi động có kèm `--profile monitoring` hoặc chạy `npm run docker:dev:full`. Kiểm tra `http://localhost:9090/targets` xem target `redis` có trạng thái `UP` không. |
| **Grafana panel Cache Hit/Miss hiển thị "No Data"** | Cờ `ENABLE_METRICS` hoặc `ENABLE_REDIS_CACHE` bị tắt | Đảm bảo `ENABLE_METRICS=true` và `ENABLE_REDIS_CACHE=true` trong file `.env.dev`. Gửi vài request API để phát sinh dữ liệu metrics. |
| **RAM sử dụng cao bất thường** | Chưa cấu hình TTL hoặc có quá nhiều key rác | Dùng RedisInsight kiểm tra danh sách key không có TTL. Cấu hình `REDIS_CACHE_TTL` hợp lý cho từng module nghiệp vụ. |
