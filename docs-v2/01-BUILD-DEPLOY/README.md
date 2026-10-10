# Build & Deploy - Tổng quan

Tài liệu này hướng dẫn cách build, deploy và vận hành dự án NestJS Base trong các môi trường khác nhau.

## Mục lục

1. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
2. [Môi trường phát triển](#môi-trường-phát-triển)
3. [Môi trường Staging](#môi-trường-staging)
4. [Môi trường Production](#môi-trường-production)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Troubleshooting](#troubleshooting)

## Yêu cầu hệ thống

### Phần mềm cần thiết

- **Node.js**: >= 24.15.0 (sử dụng cùng major version cho dev, build, runtime)
- **npm**: đi kèm với Node.js
- **Docker Desktop/Engine**: cho PostgreSQL, Redis và container hóa
- **Git**: cho version control

### Hardware tối thiểu

- **CPU**: 2 cores
- **RAM**: 4GB
- **Disk**: 10GB free space

## Môi trường phát triển

Phát triển local sử dụng Docker cho PostgreSQL/Redis và chạy NestJS trên máy host.

**Ưu điểm:**
- Hot reload nhanh
- Debug dễ dàng
- Dễ thay đổi code

**Chi tiết:** Xem [Hướng dẫn phát triển local](local-development.md)

## Môi trường Staging

Môi trường staging gần giống production để test trước khi deploy.

**Đặc điểm:**
- Chạy trên server riêng
- Dùng Docker Compose
- Data test gần giống production
- Không có dữ liệu thật của user

**Chi tiết:** Xem [Docker Setup](docker-setup.md)

## Môi trường Production

Môi trường production yêu cầu cấu hình bảo mật chặt chẽ và giám sát đầy đủ.

**Đặc điểm:**
- Multi-stage Docker image
- Secrets được bảo vệ
- Health checks
- Backup/restore
- Monitoring & alerting

**Chi tiết:** Xem [Production Deploy](production-deploy.md)

## CI/CD Pipeline

Pipeline tự động hóa build, test và deploy.

**Các bước:**
1. Lint & Type check
2. Unit tests
3. E2E tests
4. Build Docker image
5. Security scan
6. Deploy (manual approval)

**Chi tiết:** Xem [CI/CD Pipeline](ci-cd-pipeline.md)

## Troubleshooting

### Lỗi thường gặp

| Lỗi | Nguyên nhân | Giải pháp |
|-----|------------|-----------|
| `npm ci` thất bại | Node version không khớp | Kiểm tra `node --version` |
| Docker không chạy | Docker Desktop chưa start | Mở Docker Desktop |
| Migration thất bại | Database chưa sẵn sàng | Chờ PostgreSQL healthy |
| Port conflict | Port đang được dùng | Thay đổi port trong .env |

### Log location

- **Application logs**: Console/stdout
- **PostgreSQL logs**: Docker logs
- **Redis logs**: Docker logs
- **Nginx/Proxy logs**: Nếu có reverse proxy

## Tham khảo nhanh

```bash
# Local development
npm ci
npm run start:dev

# Build
npm run build

# Test
npm test -- --runInBand
npm run test:e2e

# Docker - Development
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d

# Docker - Production
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build

# Migration
npm run migration:run
npm run migration:generate -- src/database/migrations/ChangeName
```

## Tài liệu liên quan

- [Local Development](local-development.md)
- [Docker Setup](docker-setup.md)
- [Production Deploy](production-deploy.md)
- [CI/CD Pipeline](ci-cd-pipeline.md)
- [Configuration](../05-CAU-HINH/)
