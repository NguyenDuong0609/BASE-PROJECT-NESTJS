# Tài liệu Kỹ thuật - NestJS Base Project

Tài liệu kỹ thuật toàn diện cho dự án NestJS Base, được tổ chức theo cấu trúc rõ ràng để người mới có thể nhanh chóng hiểu build/deploy/code, chức năng, API, cấu hình và kiến trúc hệ thống.

## Cấu trúc tài liệu

```
docs-v2/
├── README.md                            # Tài liệu này
├── 01-BUILD-DEPLOY/                     # Build, Deploy, CI/CD
│   ├── README.md                        # Tổng quan build & deploy
│   ├── local-development.md              # Hướng dẫn phát triển local
│   ├── docker-setup.md                  # Thiết lập Docker
│   ├── production-deploy.md             # Triển khai production
│   └── ci-cd-pipeline.md                # Pipeline CI/CD
├── 02-CODE-CHUC-NANG/                   # Code & Structure
│   ├── README.md                        # Tổng quan code structure
│   ├── architecture.md                  # Kiến trúc hệ thống
│   └── module-management.md             # Quản lý module nghiệp vụ
├── 03-CHUC-NANG/                        # Chức năng hệ thống
│   ├── README.md                        # Tổng quan chức năng
│   ├── authentication.md                # Xác thực & phân quyền
│   ├── user-management.md               # Quản lý người dùng
│   ├── file-upload.md                   # Tải tệp lên
│   ├── background-jobs.md               # Tác vụ nền
│   └── domain-modules.md                # Module domain mẫu
├── 04-API/                              # Tài liệu API
│   ├── README.md                        # Tổng quan API
│   ├── api-reference.md                 # Danh sách API đầy đủ
│   ├── response-contract.md             # Contract response
│   └── swagger-postman.md               # Swagger & Postman
├── 05-CAU-HINH/                         # Cấu hình
│   ├── README.md                        # Tổng quan cấu hình
│   ├── environment-variables.md         # Biến môi trường
│   ├── feature-flags.md                 # Feature flags
│   └── third-party-integration.md       # Tích hợp bên thứ 3
└── 06-OBSERVABILITY/                    # Observability
    ├── README.md                        # Tổng quan observability
    ├── logging.md                       # Logging
    ├── metrics.md                       # Metrics
    ├── monitoring.md                    # Monitoring
    └── auditing.md                      # Auditing
```

## Đọc theo vai trò

### Developer mới
1. [01-BUILD-DEPLOY/local-development.md](01-BUILD-DEPLOY/local-development.md) - Setup môi trường
2. [02-CODE-CHUC-NANG/architecture.md](02-CODE-CHUC-NANG/architecture.md) - Hiểu kiến trúc
3. [04-API/api-reference.md](04-API/api-reference.md) - Xem API
4. [03-CHUC-NANG/](03-CHUC-NANG/) - Tìm hiểu chức năng

### Tech Lead
1. [02-CODE-CHUC-NANG/architecture.md](02-CODE-CHUC-NANG/architecture.md) - Kiến trúc chi tiết
2. [02-CODE-CHUC-NANG/module-management.md](02-CODE-CHUC-NANG/module-management.md) - Quản lý module
3. [05-CAU-HINH/environment-variables.md](05-CAU-HINH/environment-variables.md) - Cấu hình
4. [01-BUILD-DEPLOY/production-deploy.md](01-BUILD-DEPLOY/production-deploy.md) - Deploy

### DevOps
1. [01-BUILD-DEPLOY/docker-setup.md](01-BUILD-DEPLOY/docker-setup.md) - Docker
2. [01-BUILD-DEPLOY/production-deploy.md](01-BUILD-DEPLOY/production-deploy.md) - Production
3. [01-BUILD-DEPLOY/ci-cd-pipeline.md](01-BUILD-DEPLOY/ci-cd-pipeline.md) - CI/CD
4. [06-OBSERVABILITY/](06-OBSERVABILITY/) - Monitoring

## Thông tin dự án

- **Framework**: NestJS 12
- **Runtime**: Node.js >= 24.15.0
- **Language**: TypeScript 6
- **Database**: PostgreSQL 15+
- **ORM**: TypeORM
- **Cache/Queue**: Redis + BullMQ
- **Storage**: AWS S3 (tùy chọn)
- **Authentication**: JWT + OAuth2 (Google)

## Bắt đầu nhanh

Xem [Hướng dẫn phát triển local](01-BUILD-DEPLOY/local-development.md) để bắt đầu.

## Chú ý

- Tài liệu cũ nằm trong thư mục `docs/` (không xóa, chỉ tham khảo)
- Tài liệu mới trong `docs-v2/` là tài liệu chính
- Nếu có khác biệt giữa tài liệu cũ và mới, ưu tiên tài liệu mới
- Swagger/OpenAPI luôn là nguồn sự thật cho API schema
