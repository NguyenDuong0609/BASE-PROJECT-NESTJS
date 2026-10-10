# Nền tảng ứng dụng NestJS

Base REST API dùng NestJS 12, Node.js 24, TypeScript 6, PostgreSQL, TypeORM và
Redis/BullMQ. Repository có sẵn authentication, user/role, chuẩn hóa response,
validation, health checks, upload/media, queue, observability và một số domain
Flash Cards mẫu. Đây là source/template để tùy biến theo dự án; không phải dịch vụ
đã deploy hay cam kết production-ready cho mọi workload.

Google OAuth, S3, email account flows và metrics là tùy chọn, mặc định tắt.
Source domain mẫu vẫn nằm trong repository để các dự án cần có thể bật lại, nhưng
route của chúng mặc định bị ẩn bằng feature flag. Student-card upload là stub 501
và mặc định bị ẩn.

## Bắt đầu

- Yêu cầu Node.js `>=24.15.0`, npm và Docker Desktop.
- Hướng dẫn chạy trên máy Windows/Linux/macOS: [Quick Start](docs/QUICK_START.md).
- Mẫu environment: `.env.example`; hướng dẫn biến môi trường:
  [Configuration Guide](docs/CONFIGURATION_GUIDE.md).
- Hướng dẫn migration: [Database Setup](docs/DATABASE_SETUP.md).

```powershell
npm ci
Copy-Item .env.example .env.dev
# Sửa credentials local trong .env.dev
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d postgres_db redis
npm run migration:run
npm run start:dev
```

## Tài liệu dự án

| Chủ đề                                                                | Tài liệu                                                       |
| --------------------------------------------------------------------- | -------------------------------------------------------------- |
| Kiến trúc, chức năng, luồng request/auth/upload/queue và cách mở rộng | [Project Guide](docs/PROJECT_GUIDE.md)                         |
| Danh mục API theo module                                              | [API Summary](docs/API_SUMMARY.md)                             |
| Envelope response, success/error catalogs                             | [API Response Contract](docs/API_RESPONSE_CONTRACT.md)         |
| Cấu hình môi trường và feature flags                                  | [Configuration Guide](docs/CONFIGURATION_GUIDE.md)             |
| Chạy local và lệnh thường dùng                                        | [Quick Start](docs/QUICK_START.md)                             |
| Schema và quy trình migration                                         | [Database Setup](docs/DATABASE_SETUP.md)                       |
| Production Compose, build/deploy và health                            | [Deployment Guide](docs/DEPLOYMENT.md)                         |
| Backup/restore mẫu và giới hạn vận hành                               | [Backup/Restore](docs/OPERATIONS_BACKUP_RESTORE.md)            |
| Phạm vi và readiness checklist                                        | [Production Readiness Plan](docs/PRODUCTION_READINESS_PLAN.md) |

Swagger mặc định tắt; bật bằng `SWAGGER_ENABLED=true` và cung cấp thông tin bảo vệ
theo [Configuration Guide](docs/CONFIGURATION_GUIDE.md). Khi chạy local, API mặc
định ở `http://localhost:3000`, Swagger UI ở `/api-docs` nếu được bật và bảo vệ
bằng Basic Auth. Hướng dẫn import collection, tạo dữ liệu mẫu và kiểm thử API nằm
tại [API Testing Guide](docs/API_TESTING_GUIDE.md).

## Kiểm tra trước khi thay đổi

```powershell
npm run build
npm test -- --runInBand
npm run lint
npm run test:e2e
npm audit
```

E2E cần PostgreSQL/Redis khả dụng và environment phù hợp. Trước khi dùng base cho
một dịch vụ thật, hãy thay domain mẫu, rà soát authorization/DTO, thiết lập secrets,
chỉ bật provider đã cấu hình, diễn tập migration và nghiệm thu staging/backup/rollback
theo [Deployment Guide](docs/DEPLOYMENT.md).
