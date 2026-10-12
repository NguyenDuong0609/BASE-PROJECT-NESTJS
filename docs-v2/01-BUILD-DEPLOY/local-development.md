# Hướng dẫn phát triển Local

Hướng dẫn chi tiết để thiết lập và chạy dự án trên máy local cho mục đích phát triển.

## Yêu cầu

- Node.js >= 24.15.0
- npm (đi kèm Node.js)
- Docker Desktop/Engine (Docker Compose v2)
- Git

## 1. Cài đặt dependencies

```powershell
# Clone repository
git clone <repository-url>
cd <project-directory>

# Cài đặt dependencies
npm ci
```

## 2. Cấu hình môi trường

```powershell
# Copy file môi trường mẫu
Copy-Item .env.example .env.dev
```

Chỉnh sửa `.env.dev` với các giá trị sau:

### Bắt buộc thay đổi

```env
# Database credentials
DB_PASSWORD=your-local-password-here

# JWT secrets (phải ngẫu nhiên, ít nhất 32 ký tự)
JWT_ACCESS_TOKEN_SECRET=<generate-random-64-char>
JWT_REFRESH_TOKEN_SECRET=<generate-another-random-64-char>

# Frontend URL
FRONTEND_URL=http://localhost:4200
CORS_ORIGINS=http://localhost:4200
```

### Tạo JWT secrets ngẫu nhiên

```powershell
# Chạy lệnh này 2 lần để tạo 2 secret khác nhau
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

### Monitoring (Grafana)

```env
# Grafana (tùy chọn, dùng khi bật monitoring profile)
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=<tạo-password-mạnh>
GRAFANA_ROOT_URL=http://localhost:3001
```

### Tùy chọn (nếu cần Swagger)

```env
SWAGGER_ENABLED=true
SWAGGER_USERNAME=local-docs
SWAGGER_PASSWORD=replace-with-at-least-16-characters
```

## 3. Khởi động môi trường Development

### Cách A: Full Docker stack (khuyến nghị)

Chạy toàn bộ stack trong Docker, bao gồm cả RedisInsight và monitoring stack.

#### 1. Lệnh 1 dòng gọn nhất (Vừa Build vừa Start toàn bộ service – tương tự Production):
```powershell
# Sử dụng npm script (Khuyên dùng):
npm run docker:dev:build

# Hoặc lệnh Docker Compose CLI trực tiếp tương đương:
docker compose --env-file .env.dev -f docker-compose.dev.yml --profile monitoring up -d --build
```
> **Giải thích:** Cờ `--build` sẽ tự động build lại Docker image mới nhất của NestJS API & PostgreSQL (pgAudit), sau đó cờ `-d` (detached) sẽ khởi chạy ngầm tất cả các service (API, DB, Redis, RedisInsight, Grafana, Prometheus, Loki, Alloy, Redis Exporter) trong 1 lệnh duy nhất.

#### 2. Các lệnh khởi động khác khi không cần build lại:
```powershell
# Chạy toàn bộ (kèm monitoring) khi images đã build sẵn:
npm run docker:dev:full

# Chỉ chạy Core Services (API + DB + Redis + RedisInsight, không bật monitoring):
npm run docker:dev

# Hoặc dùng batch script tự động (tự clean -> build -> start -> check health):
.\start-docker.bat
```

### Cách B: DB/Redis trong Docker + NestJS trên host

Phù hợp cho debug, hot reload nhanh hơn.

```powershell
# Chỉ khởi động PostgreSQL và Redis
docker compose --env-file .env.dev -f docker-compose-infrastructure.yml up -d
```

Kiểm tra trạng thái:
```powershell
docker compose -f docker-compose-infrastructure.yml ps
```

Sau đó chạy NestJS trên host:
```powershell
$env:NODE_ENV = 'development'
npm run migration:run
npm run start:dev
```

### Cách C: Docker + monitoring ở background

```powershell
# Khởi động monitoring stack ở background
npm run docker:dev:monitoring

# Sau đó start API
npm run docker:dev
```

## 4. Chạy Migration

```powershell
# Nếu chạy NestJS trên host
$env:NODE_ENV = 'development'
npm run migration:run
```

> **Lưu ý:** Khi chạy full Docker (Cách A), migration được chạy tự động khi app khởi động qua TypeORM synchronize (dev mode) hoặc bạn cần exec vào container.

Kiểm tra migration:
```powershell
npm run migration:show
```

## 5. Xác minh hoạt động

### Health checks

```powershell
# Liveness
Invoke-RestMethod http://localhost:3317/health/live

# Readiness (kiểm tra PostgreSQL và Redis)
Invoke-RestMethod http://localhost:3317/health/ready
```

> **Lưu ý:** Port mặc định trong `.env.dev` là `3317`, không phải `3000`.

### Access Swagger (nếu đã bật)

Truy cập: `http://localhost:3317/api-docs`

Đăng nhập với username/password từ `SWAGGER_USERNAME` / `SWAGGER_PASSWORD` trong `.env.dev`.

### Access Grafana (nếu bật monitoring)

Truy cập: `http://localhost:3001`

Đăng nhập với `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD` từ `.env.dev`.

**3 Dashboard có sẵn:**

| Dashboard | Mô tả |
|-----------|--------|
| NestJS API – Metrics | Request rate, latency P50/P95/P99, error rate, cache hit, queue depth |
| NestJS API – Audit Logs | Audit events, security events, pgAudit database logs |
| NestJS API – Application Logs | Pino logs, log volume by level, error logs, PostgreSQL/Redis logs |

## 6. Công cụ phát triển

### Build và test

```powershell
# Build TypeScript
npm run build

# Run unit tests
npm test -- --runInBand

# Run E2E tests
npm run test:e2e

# Lint code
npm run lint
```

### Generate migration mới

```powershell
$env:NODE_ENV = 'development'
npm run migration:generate -- src/database/migrations/FeatureName
```

Review SQL được sinh ra trước khi chạy migration.

### Revert migration (chỉ local)

```powershell
$env:NODE_ENV = 'development'
npm run migration:revert
```

### Tạo admin user

```powershell
# Dev mode (trên host)
npm run bootstrap:admin:dev
```

## 7. Cấu trúc dự án

```
src/
├── configs/              # Cấu hình ứng dụng
├── decorators/          # Custom decorators
├── guards/              # Authentication & authorization
├── health/              # Health checks
├── modules/             # Feature modules
│   ├── auth/           # Authentication
│   ├── users/          # User management
│   ├── user-roles/     # RBAC
│   └── ...
├── observability/       # Logging, metrics, audit
├── repositories/       # Data access
├── shared/             # Shared utilities
├── database/           # Database configuration
│   └── migrations/     # Migration files
├── app.module.ts       # Root module
└── main.ts             # Entry point
```

## 8. Port mapping

### Khi chạy full Docker (Cách A)

| Service | Host Port | Container Port | Access |
|---------|-----------|----------------|--------|
| API | 3317 | 3317 | http://localhost:3317 |
| PostgreSQL | 3533 | 5432 | localhost:3533 |
| Swagger | 3317 | 3317 | http://localhost:3317/api-docs |
| Grafana | 3001 | 3000 | http://localhost:3001 |

### Khi chạy infrastructure only (Cách B)

| Service | Host Port | Container Port | Access |
|---------|-----------|----------------|--------|
| API (trên host) | 3317 | — | http://localhost:3317 |
| PostgreSQL | 5433 | 5432 | localhost:5433 |
| Redis | 6379 | 6379 | localhost:6379 |

> **Lưu ý:** Ports có thể thay đổi qua `.env.dev`. Xem `PORT`, `DB_PUBLISHED_PORT`.

## 9. Dọn dẹp

### Dừng services

```powershell
# Dừng tất cả (bao gồm monitoring) và giữ data
npm run docker:dev:remove

# Dừng và xóa data volumes
docker compose --env-file .env.dev -f docker-compose.dev.yml --profile monitoring down -v
```

### Dọn dẹp Docker

```powershell
# Cleanup unused images
docker system prune -a

# Cleanup volumes (CAUTION: mất data)
docker volume prune
```

## 10. Troubleshooting

### Port đã được sử dụng

```powershell
# Tìm process đang dùng port
netstat -ano | findstr ":3317"

# Kill process hoặc đổi port trong .env.dev
```

### Migration thất bại

```powershell
npm run migration:show
docker logs postgres_dev
```

### Docker không chạy

```powershell
docker ps
# Nếu lỗi → Restart Docker Desktop
```

### TypeORM sync error

Kiểm tra `DB_HOST` trong `.env.dev`:
- Khi chạy migration từ host: `localhost` (port `3533` hoặc `DB_PUBLISHED_PORT`)
- Khi chạy trong Docker: `postgres_db` (port `5432`)

### Monitoring không hiển thị data

1. Kiểm tra API có expose `/metrics`: `curl http://localhost:3317/metrics`
2. Kiểm tra `ENABLE_METRICS=true` trong `.env.dev`
3. Kiểm tra `LOG_FORMAT=json` (Alloy cần JSON logs)
4. Chờ 15-30 giây để Prometheus scrape và Loki ingest

## 11. Mẹo

- **Hot reload**: Chỉnh sửa code trong `src/` sẽ tự động reload (Docker mount volumes)
- **Environment**: Luôn dùng `.env.dev` cho local, không commit secrets thật
- **Testing**: Run test trước khi commit
- **Migration**: Review migration SQL trước khi apply
- **Monitoring**: Bật `--profile monitoring` để có Grafana dashboards giống production

## Tài liệu liên quan

- [Docker Setup](docker-setup.md)
- [Configuration](../05-CAU-HINH/environment-variables.md)
- [Architecture](../02-CODE-CHUC-NANG/architecture.md)
- [Observability](../06-OBSERVABILITY/)
