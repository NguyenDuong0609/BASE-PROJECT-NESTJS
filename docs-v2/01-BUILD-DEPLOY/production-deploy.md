# Production Deploy

Hướng dẫn triển khai dự án lên môi trường production với đầy đủ stack ứng dụng và hạ tầng giám sát (Observability: Grafana, Loki, Prometheus, Alloy, pgAudit).

## Yêu cầu trước khi deploy

### Checklist

- [ ] Tất cả tests pass (unit + e2e): `npm run test` & `npm run test:e2e`
- [ ] Lint pass: `npm run lint`
- [ ] Build thành công: `npm run build`
- [ ] Migration đã review: `npm run migration:show`
- [ ] Secrets đã cấu hình an toàn trong `.env.prod`
- [ ] Database backup plan sẵn sàng
- [ ] Monitoring/alerting đã setup
- [ ] Staging đã test thành công
- [ ] Rollback plan đã chuẩn bị

### Server requirements

- **OS**: Linux (Ubuntu 22.04+ recommended) hoặc Windows Server có Docker Desktop / WSL2
- **Docker**: Engine 20.10+, Docker Compose v2
- **CPU**: 4 cores minimum
- **RAM**: 8GB minimum
- **Disk**: 50GB SSD minimum
- **TLS Certificate**: Valid SSL certificate (Let's Encrypt / Cloudflare)

---

## 1. Chuẩn bị Environment

### Tạo file .env.prod

```bash
# Copy từ .env.example
cp .env.example .env.prod
```

**Cấu hình chi tiết cho Production:**

```env
# ==============================================================================
# Production Environment Configuration (.env.prod)
# ==============================================================================

# Application
NODE_ENV=production
PORT=3000
APP_VERSION=1.0.0
APP_IMAGE=flash-cards-api
TRUST_PROXY_HOPS=1
LOG_LEVEL=info
LOG_FORMAT=json

# Database (PostgreSQL kèm pgAudit)
DB_HOST=postgres_db
DB_PORT=5432
DB_USERNAME=production_user
DB_PASSWORD=<strong-password-min-16-chars>
DB_DATABASE=production_db
DB_LOGGING=false
DB_POOL_SIZE=20
DB_CONNECTION_TIMEOUT_MS=5000
DB_QUERY_TIMEOUT_MS=15000

# Redis Cache & Queue
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<strong-password-min-16-chars-base64url>
REDIS_DB=0
APP_CACHE_PREFIX=nestjs-base

# Observability & Monitoring (Loki, Prometheus, Grafana, pgAudit)
ENABLE_METRICS=true
ENABLE_PGAUDIT=true
AUDIT_RETENTION_DAYS=90
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=<strong-random-password-min-16-chars>
GRAFANA_ROOT_URL=http://localhost:3001

# JWT Secrets (Bắt buộc >= 32 ký tự, tuyệt đối không dùng tiền tố placeholder)
JWT_ACCESS_TOKEN_SECRET=<generate-random-64-char-hex>
JWT_REFRESH_TOKEN_SECRET=<generate-another-random-64-char-hex>
JWT_ACCESS_TOKEN_EXPIRATION=15m
JWT_REFRESH_TOKEN_EXPIRATION=7d

# Frontend & CORS (Bắt buộc dùng giao thức HTTPS trong production)
FRONTEND_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com

# Swagger UI (BẮT BUỘC tắt trong production)
SWAGGER_ENABLED=false
SWAGGER_USERNAME=
SWAGGER_PASSWORD=

# Feature flags (Tùy chỉnh theo yêu cầu dự án)
ENABLE_FLASH_CARDS=false
ENABLE_COLLECTIONS=false
ENABLE_TOPICS=false
ENABLE_CHECKIN=false
ENABLE_COMMENTS=false
ENABLE_FLASH_CARD_STATES=false
ENABLE_STUDENT_CARD_UPLOADS=false
ENABLE_TWO_FACTOR=false
TWO_FACTOR_ENCRYPTION_KEY=
ENABLE_ACCOUNT_EMAIL_FLOWS=false
REQUIRE_VERIFIED_EMAIL=false

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf

# AWS S3 (Tùy chọn)
ENABLE_S3=false
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=

# Google OAuth (Tùy chọn)
ENABLE_GOOGLE_OAUTH=false
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
```

> [!WARNING]
> **Yêu cầu nghiêm ngặt của Validation Schema trong Production (`NODE_ENV=production`):**
> 1. `JWT_ACCESS_TOKEN_SECRET` và `JWT_REFRESH_TOKEN_SECRET`: Độ dài tối thiểu 32 ký tự, không được trùng nhau và **bị từ chối ngay lập tức** nếu chứa tiền tố placeholder như `your_*`, `change_me`, `example`, `replace_*`, `default`.
> 2. `FRONTEND_URL`: Bắt buộc phải bắt đầu bằng `https://`.
> 3. `REDIS_PASSWORD`: Bắt buộc tối thiểu 16 ký tự theo định dạng `[A-Za-z0-9_-]`.
> 4. `SWAGGER_ENABLED`: Bắt buộc phải là `false`.

**Lệnh tạo secrets ngẫu nhiên:**

```bash
# Tạo JWT Secrets (Hex 64 ký tự)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Tạo Redis Password (Base64url an toàn)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# Tạo Grafana Admin Password
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

### Bảo mật file cấu hình

```bash
# Phân quyền chỉ định cho user chạy ứng dụng (Linux)
chmod 600 .env.prod
```

---

## 2. Build Docker Images

### Option 1: Build Image qua CI/CD và đẩy lên Container Registry

```bash
# Tag với commit SHA hoặc version
docker build -t registry.example.com/nestjs-base:${APP_VERSION} .

# Push lên private registry
docker push registry.example.com/nestjs-base:${APP_VERSION}
```

### Option 2: Build Image trực tiếp trên máy chủ

```bash
# Build production image
docker compose --env-file .env.prod -f docker-compose.prod.yml build
```

---

## 3. Triển khai với Docker Compose

### 3.1. Triển khai ứng dụng cơ bản (API + PostgreSQL + Redis)

```bash
# 1. Kiểm tra cú pháp cấu hình
docker compose --env-file .env.prod -f docker-compose.prod.yml config --quiet

# 2. Khởi động các dịch vụ
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

Hoặc sử dụng npm scripts:
```bash
npm run docker:prod:up
```

---

### 3.2. Triển khai Full Stack kèm Observability (Grafana + Loki + Prometheus + Alloy)

Dự án cung cấp file `docker-compose.audit.yml` chứa đầy đủ stack observability đồng bộ với môi trường phát triển:

```bash
# Khởi động với profile audit-ui (hoặc monitoring)
docker compose --env-file .env.prod \
  -f docker-compose.prod.yml \
  -f docker-compose.audit.yml \
  --profile audit-ui \
  up -d --build
```

**Sử dụng npm scripts tích hợp:**
```bash
# Khởi động kèm monitoring
npm run docker:prod:monitoring

# Build lại và khởi động full stack
npm run docker:prod:full

# Dừng monitoring stack
npm run docker:prod:remove
```

**Trên môi trường Windows:**
Có thể chạy trực tiếp file kịch bản tự động:
```powershell
.\start-prod.bat
```

Sau khi khởi động, Grafana chạy tại cổng `3001` và **tự động tải sẵn 3 dashboards** từ thư mục `observability/grafana/dashboards/`:
- **📊 NestJS API Metrics** (Prometheus): Đo lường req/s, P50/P95/P99 latency, 4xx/5xx error rates, cache hit rate, queue depth.
- **📋 NestJS Audit Logs** (Loki):
  - **🌐 API Request Audit Logs**: Luồng log thời gian thực chi tiết từng request (Method, URL, Status Code, Response Time ms, Remote IP, User Agent) và phân tích tỷ lệ lỗi 4xx/5xx.
  - **📋 Application Audit Events**: Các sự kiện kiểm toán nghiệp vụ ghi nhận từ `AuditLogService` (`event=audit_event`).
  - **🔐 Security Audit Events**: Giám sát xác thực (`AUTH_*`), phân quyền, tài khoản (`ACCOUNT_*`).
  - **🐘 PostgreSQL pgAudit Logs**: Nhật ký câu lệnh DDL/DML cấp cơ sở dữ liệu ghi bởi pgAudit.
- **📝 NestJS Pino Application Logs** (Loki): Luồng log ứng dụng thời gian thực với định dạng JSON, bảng phân bổ log level, lọc lỗi chuyên dụng và nhật ký hạ tầng.

---

### 3.3. Kiểm tra trạng thái triển khai

```bash
# Trạng thái containers
docker compose --env-file .env.prod -f docker-compose.prod.yml -f docker-compose.audit.yml --profile audit-ui ps

# Kiểm tra Liveness Probe
curl -i http://localhost:3000/health/live

# Kiểm tra Readiness Probe (DB & Redis)
curl -i http://localhost:3000/health/ready

# Kiểm tra Prometheus Metrics
curl -i http://localhost:3000/metrics

# Xem logs thời gian thực của API
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f api
```

---

## 4. Database Migration

Cơ chế migration chạy tự động trong một container tạm thời (`migrate`) trước khi container `api` khởi động:

```yaml
services:
  migrate:
    image: ${APP_IMAGE:-flash-cards-api}:${APP_VERSION}
    command:
      - node
      - ./node_modules/typeorm/cli.js
      - migration:run
      - -d
      - dist/database/data-source.js
    depends_on:
      postgres_db:
        condition: service_healthy

  api:
    depends_on:
      migrate:
        condition: service_completed_successfully
```

### Chạy migration thủ công khi cần:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec api \
  node ./node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js
```

---

## 5. Cấu hình Reverse Proxy (Nginx)

Ví dụ cấu hình Nginx reverse proxy bảo vệ API và giới hạn truy cập metrics:

```nginx
upstream nestjs_api {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/ssl/certs/yourdomain.com.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.com.key;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=20r/s;
    limit_req zone=api burst=40 nodelay;

    location / {
        proxy_pass http://nestjs_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Metrics endpoint chỉ mở cho IP nội bộ
    location /metrics {
        allow 127.0.0.1;
        allow 10.0.0.0/8;
        deny all;
        proxy_pass http://nestjs_api;
    }
}
```

---

## 6. Chiến lược Sao lưu (Backup Strategy)

### Sao lưu tự động PostgreSQL

```bash
#!/bin/bash
# /scripts/postgres-backup.sh
BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p ${BACKUP_DIR}

docker compose --env-file /app/.env.prod -f /app/docker-compose.prod.yml exec -T postgres_db \
  pg_dump -U ${DB_USERNAME} ${DB_DATABASE} | gzip > ${BACKUP_DIR}/backup_${DATE}.sql.gz

# Giữ lại bản sao lưu trong 30 ngày
find ${BACKUP_DIR} -name "backup_*.sql.gz" -mtime +30 -delete
```

### Thiết lập Cron job:

```bash
# /etc/cron.d/postgres-backup (chạy lúc 2:00 sáng hàng ngày)
0 2 * * * root /scripts/postgres-backup.sh
```

---

## 7. Giám sát & Health Checks

### Endpoint Health Checks

| Endpoint | Mục đích | Tiêu chuẩn đánh giá |
|---|---|---|
| `GET /health/live` | Liveness Probe | Tiến trình Node.js không bị treo event loop |
| `GET /health/ready` | Readiness Probe | Kết nối PostgreSQL và Redis hoạt động bình thường |
| `GET /metrics` | Prometheus Metrics | Thu thập số liệu hiệu năng (chỉ bật khi `ENABLE_METRICS=true`) |

### Truy cập Grafana:
- Địa chỉ: `http://localhost:3001`
- Tài khoản: `admin` (hoặc giá trị `GRAFANA_ADMIN_USER`)
- Mật khẩu: Giá trị trong biến `GRAFANA_ADMIN_PASSWORD` của `.env.prod`

---

## 8. Rolling Update & Zero-Downtime

```bash
# 1. Pull hoặc build image mới với tag phiên bản mới
docker pull registry.example.com/nestjs-base:${NEW_VERSION}

# 2. Cập nhật container api
APP_VERSION=${NEW_VERSION} docker compose --env-file .env.prod -f docker-compose.prod.yml up -d api

# 3. Chờ đợi health check xác nhận sẵn sàng
while ! curl -sf http://localhost:3000/health/ready > /dev/null; do
    echo "Waiting for API to be ready..."
    sleep 3
done
echo "Update completed successfully!"
```

---

## 9. Rollback

### Rollback ứng dụng:

```bash
# 1. Khai báo version trước đó
export APP_VERSION=<previous-commit-sha>

# 2. Deploy lại image cũ
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --remove-orphans

# 3. Kiểm tra health check
curl -f http://localhost:3000/health/ready
```

### Rollback migration (nếu có sự cố schema):

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec api \
  node ./node_modules/typeorm/cli.js migration:revert -d dist/database/data-source.js
```

---

## 10. Xử lý sự cố thường gặp (Troubleshooting)

### Container `api` báo lỗi khi khởi động do secrets:
- Kiểm tra `JWT_ACCESS_TOKEN_SECRET` và `JWT_REFRESH_TOKEN_SECRET`: Đảm bảo không chứa từ khóa ví dụ (`your_`, `change_me`, `example`).
- Kiểm tra `FRONTEND_URL`: Đảm bảo sử dụng giao thức `https://`.
- Kiểm tra `REDIS_PASSWORD`: Đảm bảo độ dài từ 16 ký tự trở lên.

### Grafana không nhận log API Request hoặc log ứng dụng:
- Đảm bảo biến `LOG_FORMAT=json` trong `.env.prod`. Nếu để `LOG_FORMAT=pretty`, Alloy không thể trích xuất các trường JSON (`context=HTTP`, `res.statusCode`...).
- Kiểm tra container `alloy`: `docker compose -f docker-compose.prod.yml -f docker-compose.audit.yml --profile audit-ui logs alloy`.

### Grafana Dashboard "NestJS API Metrics" không có số liệu:
- Kiểm tra biến `ENABLE_METRICS=true` trong `.env.prod`.
- Kiểm tra Prometheus đã scrape được target: `curl http://localhost:3000/metrics`.

### Truy cập `/api-docs` trả về `404 Cannot GET /api-docs`:
- Đây là **hành vi chuẩn và có chủ đích** trong môi trường production (`SWAGGER_ENABLED=false`).
- Theo tiêu chuẩn bảo mật (Security Hardening), tài liệu Swagger không được công khai trên Production để bảo vệ schema và endpoint của hệ thống.
- Để tra cứu Swagger UI, vui lòng sử dụng môi trường Development: `http://localhost:3317/api-docs` (đăng nhập bằng Basic Auth cấu hình trong `.env.dev`).

---

## Tài liệu liên quan

- [Docker Setup](docker-setup.md)
- [CI/CD Pipeline](ci-cd-pipeline.md)
- [Configuration Guide](../05-CAU-HINH/environment-variables.md)
- [Observability Guide](../06-OBSERVABILITY/monitoring.md)
