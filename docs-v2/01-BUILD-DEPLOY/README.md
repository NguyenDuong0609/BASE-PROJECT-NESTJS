# Build & Deploy - Tổng quan

Tài liệu này hướng dẫn cách build, deploy và vận hành dự án NestJS Base trong các môi trường khác nhau.

## Mục lục

1. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
2. [Môi trường phát triển](#môi-trường-phát-triển)
3. [Môi trường Production](#môi-trường-production)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Troubleshooting](#troubleshooting)

## Yêu cầu hệ thống

### Phần mềm cần thiết

- **Node.js**: >= 24.15.0 (sử dụng cùng major version cho dev, build, runtime)
- **npm**: đi kèm với Node.js
- **Docker Desktop/Engine**: Docker Compose v2
- **Git**: cho version control

### Hardware tối thiểu

| Mục đích | CPU | RAM | Disk |
|----------|-----|-----|------|
| Development | 2 cores | 4 GB | 10 GB |
| Production | 4 cores | 8 GB | 50 GB SSD |

## Cấu trúc Docker Compose

Dự án sử dụng nhiều file Docker Compose cho các mục đích khác nhau:

| File | Mục đích | Profile |
|------|----------|---------|
| `docker-compose.dev.yml` | Development – API + DB + Redis + Monitoring | `monitoring` |
| `docker-compose.prod.yml` | Production – full stack | — |
| `docker-compose.audit.yml` | Observability stack (Grafana, Loki, Prometheus, Alloy) | `audit-ui` |
| `docker-compose-infrastructure.yml` | Chỉ DB + Redis (chạy NestJS trên host) | — |

### Multi-stage Dockerfile

```dockerfile
# Base
FROM node:24-alpine AS base
WORKDIR /usr/src/app
COPY package.json package-lock.json ./

# Development – hot reload
FROM base AS development
ENV NODE_ENV=development
RUN npm ci
COPY . .
USER node
CMD ["npm", "run", "start:dev"]

# Build
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# Production – minimal image
FROM node:24-alpine AS production
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build --chown=node:node /usr/src/app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

## Môi trường phát triển

Có 2 cách chạy development:

### Cách 1: Chạy NestJS trên host + DB/Redis trong Docker

Phù hợp khi cần debug trực tiếp, hot reload nhanh.

```powershell
# Khởi động chỉ PostgreSQL + Redis
docker compose --env-file .env.dev -f docker-compose-infrastructure.yml up -d

# Cài đặt dependencies
npm ci

# Chạy migration
$env:NODE_ENV = 'development'
npm run migration:run

# Start app với hot reload
npm run start:dev
```

### Cách 2: Toàn bộ stack trong Docker (khuyến nghị)

Chạy API + DB + Redis, có thêm monitoring stack giống production.

```powershell
# Chỉ API + DB + Redis (không monitoring)
npm run docker:dev

# Với monitoring (Grafana + Prometheus + Loki + Alloy)
npm run docker:dev:full

# Hoặc start monitoring ở background
npm run docker:dev:monitoring
```

Hoặc dùng batch script:
```powershell
.\start-docker.bat
```

**Chi tiết:** Xem [Hướng dẫn phát triển local](local-development.md)

## Môi trường Production

Production yêu cầu:
- File `.env.prod` với secrets thật
- TLS termination (nginx/traefik) trước API
- Resource limits cho containers

```bash
# Build + deploy
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build

# Với observability stack
docker compose --env-file .env.prod --profile audit-ui \
  -f docker-compose.prod.yml -f docker-compose.audit.yml up -d --build
```

**Chi tiết:** Xem [Production Deploy](production-deploy.md)

## CI/CD Pipeline

Pipeline tự động hóa (GitLab CI):
1. **build** – `npm ci` + `npm run build`
2. **test** – Unit tests, E2E tests, lint, dependency audit
3. **package** – Build Docker images (API + PostgreSQL pgAudit)
4. **deploy** – Deploy đến staging/production (manual approval)

**Chi tiết:** Xem [CI/CD Pipeline](ci-cd-pipeline.md)

## NPM Scripts tham khảo nhanh

```powershell
# ─── Development ──────────────────────────────────
npm run start:dev              # Hot reload trên host
npm run docker:dev             # Full Docker (API+DB+Redis)
npm run docker:dev:full        # Full Docker + monitoring (foreground)
npm run docker:dev:monitoring  # Start monitoring stack (background)
npm run docker:dev:remove      # Stop + remove tất cả containers

# ─── Production ───────────────────────────────────
npm run docker:prod            # Start production stack
npm run docker:prod:build      # Build production images
npm run docker:prod:down       # Stop production stack
npm run docker:prod:logs       # Tail production logs

# ─── Database ─────────────────────────────────────
npm run migration:run          # Chạy migration
npm run migration:generate -- src/database/migrations/Name
npm run migration:revert       # Revert migration cuối
npm run migration:show         # Xem trạng thái migration
npm run bootstrap:admin:dev    # Tạo admin user (dev)

# ─── Testing ──────────────────────────────────────
npm test -- --runInBand        # Unit tests
npm run test:e2e               # E2E tests
npm run lint                   # Lint code
```

## Troubleshooting

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-----------|-----------|
| `npm ci` thất bại | Node version sai | Kiểm tra `node --version` >= 24.15.0 |
| Docker không chạy | Docker Desktop chưa start | Mở Docker Desktop |
| Migration thất bại | DB chưa healthy | Chờ `docker compose ps` hiện healthy |
| Port conflict | Port đang dùng | Thay port trong `.env.dev` |
| Monitoring không hiển thị data | Profile chưa bật | Thêm `--profile monitoring` |

## Tài liệu liên quan

- [Local Development](local-development.md)
- [Docker Setup](docker-setup.md)
- [Production Deploy](production-deploy.md)
- [CI/CD Pipeline](ci-cd-pipeline.md)
- [Configuration](../05-CAU-HINH/)
- [Observability](../06-OBSERVABILITY/)
