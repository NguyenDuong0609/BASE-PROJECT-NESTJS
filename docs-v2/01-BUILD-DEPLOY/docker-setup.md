# Docker Setup

Hướng dẫn thiết lập và sử dụng Docker cho development và production.

## Tổng quan

Dự án sử dụng Docker Compose với nhiều file và profiles để quản lý các môi trường khác nhau.

### File Compose

| File | Mục đích | Ghi chú |
|------|----------|---------|
| `docker-compose.dev.yml` | Development (API + DB + Redis + Monitoring) | Profile `monitoring` cho Grafana stack |
| `docker-compose.prod.yml` | Production (full stack) | Bao gồm `migrate` service |
| `docker-compose.audit.yml` | Observability stack (Grafana, Loki, Prometheus, Alloy) | Profile `audit-ui`, dùng chung với prod |
| `docker-compose-infrastructure.yml` | Chỉ DB + Redis | Dùng khi chạy NestJS trên host |

### Multi-stage Dockerfile

```dockerfile
FROM node:24-alpine AS base
WORKDIR /usr/src/app
COPY package.json package-lock.json ./

FROM base AS development     # Hot reload, full devDependencies
FROM base AS build           # npm ci + npm run build
FROM node:24-alpine AS production  # Chỉ dist/ + production deps
```

**Target `development`**: mount source code, chạy `npm run start:dev`
**Target `production`**: minimal image, chạy `node dist/main.js`, non-root user

## Development Docker

### Khởi động cơ bản (API + DB + Redis)

```powershell
# Foreground (xem logs)
npm run docker:dev

# Hoặc build riêng trước
docker compose --env-file .env.dev -f docker-compose.dev.yml build
docker compose --env-file .env.dev -f docker-compose.dev.yml up
```

### Khởi động với Monitoring Stack

```powershell
# Foreground – tất cả services + monitoring
npm run docker:dev:full

# Background – chỉ monitoring stack
npm run docker:dev:monitoring

# Hoặc dùng batch script (bao gồm monitoring)
.\start-docker.bat
```

Monitoring & Cache Management stack bao gồm:
- **RedisInsight** – Visual Redis Cache UI → `http://localhost:5540`
- **Grafana** – Dashboard UI → `http://localhost:3001`
- **Prometheus** – Metrics collection → scrape `/metrics` và `redis-exporter:9121`
- **Redis Exporter** – Prometheus exporter cho Redis metrics (RAM, CPU, Hit/Miss)
- **Loki** – Log aggregation → nhận logs từ Alloy
- **Alloy** – Log collector → đọc Docker container logs qua Docker socket

### Kiểm tra trạng thái

```powershell
docker compose --env-file .env.dev -f docker-compose.dev.yml --profile monitoring ps
```

Kết quả dự kiến:
```
NAME             STATUS          PORTS
api              Up (healthy)    127.0.0.1:3317->3317/tcp
postgres_db      Up (healthy)    127.0.0.1:3533->5432/tcp
redis            Up (healthy)
redisinsight     Up              127.0.0.1:5540->5540/tcp
redis-exporter   Up              9121/tcp
grafana          Up              127.0.0.1:3001->3000/tcp
prometheus       Up              127.0.0.1:9090->9090/tcp
loki             Up              127.0.0.1:3100->3100/tcp
alloy            Up              127.0.0.1:12345->12345/tcp
```

### Xem logs

```powershell
# Tất cả services
docker compose -f docker-compose.dev.yml logs -f

# Chỉ API
docker compose -f docker-compose.dev.yml logs -f api

# Chỉ PostgreSQL
docker compose -f docker-compose.dev.yml logs -f postgres_db
```

### Dừng services

```powershell
# Dừng tất cả (bao gồm monitoring) và giữ data
npm run docker:dev:remove

# Dừng và xóa data volumes
docker compose --env-file .env.dev -f docker-compose.dev.yml --profile monitoring down -v
```

## Production Docker

### Yêu cầu

- File `.env.prod` với secrets thật (xem [Production Deploy](production-deploy.md))
- Docker Compose v2
- TLS termination (nginx/traefik) trước API
- `APP_VERSION` – immutable version identifier (commit SHA)

### Build và deploy

```bash
# Validate config
docker compose --env-file .env.prod -f docker-compose.prod.yml config --quiet

# Build images
APP_VERSION=$(git rev-parse HEAD) \
docker compose --env-file .env.prod -f docker-compose.prod.yml build

# Deploy
APP_VERSION=$(git rev-parse HEAD) \
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

### Production với Observability Stack

```bash
APP_VERSION=$(git rev-parse HEAD) \
docker compose --env-file .env.prod --profile audit-ui \
  -f docker-compose.prod.yml -f docker-compose.audit.yml up -d
```

### Kiểm tra health

```bash
# Container status
docker compose -f docker-compose.prod.yml ps

# API health check
curl http://localhost:3000/health/ready
```

## Cấu trúc Services

### Development Compose (`docker-compose.dev.yml`)

```yaml
services:
  api:                    # NestJS API (target: development)
    build: { target: development }
    env_file: .env.dev
    ports: ['127.0.0.1:${PORT:-3000}:${PORT:-3000}']
    volumes: ['.:/usr/src/app']  # Hot reload

  postgres_db:            # PostgreSQL 15 + pgAudit extension
    image: nestjs-base-postgres:15-pgaudit
    build: { dockerfile: docker/postgres/Dockerfile }
    command: [postgres, -c, shared_preload_libraries=pgaudit, ...]

  redis:                  # Redis 7 Alpine
    image: redis:7-alpine

  # ── Profile: monitoring ──
  loki:                   # Log aggregation
  alloy:                  # Docker log collector
  prometheus:             # Metrics scraper
  grafana:                # Dashboard UI (port 3001)
```

### Production Compose (`docker-compose.prod.yml`)

```yaml
services:
  migrate:                # Chạy migration trước khi API start
    command: [node, ./node_modules/typeorm/cli.js, migration:run, -d, dist/database/data-source.js]
    restart: 'no'         # Chạy 1 lần rồi dừng

  api:                    # NestJS API (target: production)
    depends_on:
      migrate: { condition: service_completed_successfully }
    mem_limit: 768m
    cpus: 1.0

  postgres_db:            # PostgreSQL 15 + pgAudit
  redis:                  # Redis 7 với password validation (entrypoint.sh)
```

**Đặc biệt:**
- `migrate` service chạy TypeORM migration tự động trước khi `api` start
- API chỉ start khi migration thành công (`service_completed_successfully`)
- Redis production dùng `entrypoint.sh` kiểm tra password >= 16 ký tự, chỉ base64url characters
- API được giới hạn `768m` RAM và `1.0` CPU

## PostgreSQL với pgAudit

PostgreSQL sử dụng custom image với pgAudit extension:

```dockerfile
# docker/postgres/Dockerfile
FROM postgres:15-bookworm
RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-15-pgaudit \
    && rm -rf /var/lib/apt/lists/*
COPY docker/postgres/init/10-pgaudit.sql /docker-entrypoint-initdb.d/10-pgaudit.sql
```

pgAudit configuration (qua command):
- `pgaudit.log=write,ddl,role` – Log WRITE, DDL, ROLE operations
- `pgaudit.log_parameter=off` – Không log parameters (security)
- `pgaudit.log_relation=on` – Log relation names
- `log_line_prefix` – Include timestamp, user, db, app, client info

## Redis Configuration

### Development

Redis chạy đơn giản, password optional:
```yaml
command: 'if [ -n "$$REDIS_PASSWORD" ]; then
  exec redis-server --appendonly yes --requirepass "$$REDIS_PASSWORD";
else
  exec redis-server --appendonly yes;
fi'
```

### Production

Redis sử dụng custom entrypoint script (`docker/redis/entrypoint.sh`):
- Kiểm tra `REDIS_PASSWORD` >= 16 ký tự
- Chỉ cho phép base64url characters
- Giới hạn `maxmemory 512mb`, policy `noeviction`

## Observability Stack

### Thành phần

| Service | Image | Port | Mục đích |
|---------|-------|------|----------|
| Grafana | `grafana/grafana:12.1.1` | `3001` | Dashboard visualization |
| Prometheus | `prom/prometheus:v3.5.0` | internal | Metrics scraping |
| Loki | `grafana/loki:3.5.5` | internal | Log aggregation |
| Alloy | `grafana/alloy:v1.11.0` | internal | Docker log collector |

### Grafana Dashboards có sẵn

Khi Grafana khởi động, 4 dashboard đã được cấu hình sẵn:

| Dashboard | Datasource | Nội dung |
|-----------|-----------|----------|
| **NestJS API – Metrics** | Prometheus | Request rate, latency P50/P95/P99, error %, cache hit rate, queue depth, top endpoints |
| **Redis & Cache Performance** | Prometheus | Redis RAM (used/peak/max/fragmentation), CPU (user/sys/saves), % Cache Hit/Miss theo namespace, throughput |
| **NestJS API – Audit Logs** | Loki | Audit events, security events, pgAudit database logs |
| **NestJS API – Application Logs** | Loki | Pino structured logs, log volume by level, error logs, PostgreSQL/Redis logs |

### Cấu hình files

```
observability/
├── loki-config.yml              # Loki storage + schema config
├── alloy-config.alloy           # Docker log discovery + Pino JSON parsing
└── grafana/
    ├── dashboards/              # Pre-built dashboard JSON files
    │   ├── nestjs-api-metrics.json
    │   ├── redis-cache-performance.json
    │   ├── nestjs-audit-logs.json
    │   └── nestjs-pino-logs.json
    └── provisioning/
        ├── datasources/
        │   └── datasources.yml  # Auto-configure Prometheus + Loki datasources
        └── dashboards/
            └── dashboards.yml   # Auto-load dashboard files
```

## Environment Variables trong Docker

### Development

```powershell
# Compose đọc từ .env.dev
docker compose --env-file .env.dev -f docker-compose.dev.yml up
```

Biến quan trọng trong `.env.dev`:
- `PORT=3317` – API port
- `DB_PUBLISHED_PORT=3533` – PostgreSQL exposed port
- `ENABLE_METRICS=true` – Bật Prometheus metrics endpoint
- `LOG_FORMAT=json` – JSON logs cho Alloy/Loki pipeline
- `GRAFANA_ADMIN_PASSWORD` – Password Grafana admin

### Production

```bash
# Compose đọc từ .env.prod
APP_VERSION=<commit-sha> \
docker compose --env-file .env.prod -f docker-compose.prod.yml up
```

**Quan trọng:**
- Không commit `.env.prod`
- Sử dụng secret manager cho production
- `APP_VERSION` là bắt buộc cho production (immutable release identifier)

## Health Checks

### API (dev + prod)

```yaml
healthcheck:
  test: [CMD, node, -e, "fetch('http://127.0.0.1:' + process.env.PORT + '/health/ready').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 180s  # dev: 180s, prod: 40s
```

### PostgreSQL

```yaml
healthcheck:
  test: ['CMD-SHELL', 'pg_isready -U "$${POSTGRES_USER}" -d "$${POSTGRES_DB}"']
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 10s
```

### Redis

```yaml
healthcheck:
  test: [CMD-SHELL, 'redis-cli ping | grep -q PONG']
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 10s
```

## Volume Management

### Development volumes

```powershell
# List volumes
docker volume ls

# Xóa volume (CAUTION: mất data)
docker volume rm <volume-name>

# Xóa toàn bộ data dev
docker compose --env-file .env.dev -f docker-compose.dev.yml --profile monitoring down -v
```

### Production volumes

Volumes production cần:
- Regular backup (xem [Production Deploy](production-deploy.md))
- Monitor disk space
- Retention policy cho Prometheus (15d) và Loki

## Troubleshooting

### Container không khởi động

```powershell
docker compose -f docker-compose.dev.yml logs api
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml restart api
```

### Database connection error

```powershell
docker compose -f docker-compose.dev.yml logs postgres_db
docker compose -f docker-compose.dev.yml exec api sh -c "nc -z postgres_db 5432"
```

### Monitoring không có data

1. Kiểm tra `ENABLE_METRICS=true` trong `.env.dev`
2. Truy cập `http://localhost:3317/metrics` – phải thấy Prometheus text
3. Kiểm tra Prometheus targets: exec vào prometheus container
4. Kiểm tra Alloy đang chạy: `docker compose -f docker-compose.dev.yml logs alloy`

### Out of disk space

```powershell
docker system prune -a
docker volume prune
```

### Port conflict

```powershell
netstat -ano | findstr ":3317"
# Đổi PORT trong .env.dev
```

## Best Practices

1. **Không dùng tag `latest`** – Dùng version cụ thể (đã configured)
2. **Non-root user** – Container chạy với user `node`
3. **Health checks** – Tất cả services đều có health check
4. **Resource limits** – Set limits trong production compose
5. **Secrets management** – Không hardcode secrets trong compose files
6. **Monitoring parity** – Dev dùng cùng stack monitoring với production

## Tài liệu liên quan

- [Local Development](local-development.md)
- [Production Deploy](production-deploy.md)
- [Observability](../06-OBSERVABILITY/)
- [Configuration](../05-CAU-HINH/environment-variables.md)
