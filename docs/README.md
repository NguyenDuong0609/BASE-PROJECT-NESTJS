# Mục lục tài liệu

Tài liệu được cập nhật theo source NestJS 12 hiện tại. Bắt đầu tại
[Quick Start](QUICK_START.md), sau đó dùng [Project Guide](PROJECT_GUIDE.md) để
hiểu module, luồng hoạt động và cách mở rộng.

| Cần tìm                                                         | Tài liệu                                                     |
| --------------------------------------------------------------- | ------------------------------------------------------------ |
| Setup local, chạy API, test, tạo feature đầu tiên               | [QUICK_START.md](QUICK_START.md)                             |
| Tổng quan năng lực base/domain mẫu, kiến trúc, luồng và mở rộng | [PROJECT_GUIDE.md](PROJECT_GUIDE.md)                         |
| Routes theo module và endpoint platform                         | [API_SUMMARY.md](API_SUMMARY.md)                             |
| Thêm module, API response, log, metrics, tracing và healthcheck | [MODULE_INTEGRATION_GUIDE.md](MODULE_INTEGRATION_GUIDE.md)   |
| Swagger/Postman, dữ liệu mẫu và quy trình kiểm thử API          | [API_TESTING_GUIDE.md](API_TESTING_GUIDE.md)                 |
| Envelope, message catalog và errors                             | [API_RESPONSE_CONTRACT.md](API_RESPONSE_CONTRACT.md)         |
| Environment variables, flags, SMTP/S3/Google/Swagger            | [CONFIGURATION_GUIDE.md](CONFIGURATION_GUIDE.md)             |
| PostgreSQL schema, migrations, e2e database                     | [DATABASE_SETUP.md](DATABASE_SETUP.md)                       |
| Audit database/application/request và Grafana dashboard         | [AUDIT_GUIDE.md](AUDIT_GUIDE.md)                             |
| Grafana, luồng log/metric/audit, dashboard và khởi động toàn stack | [GRAFANA_GUIDE.md](GRAFANA_GUIDE.md)                         |
| Docker production build, deploy, health checks và CI gates      | [DEPLOYMENT.md](DEPLOYMENT.md)                               |
| PostgreSQL backup/restore procedure và giới hạn                 | [OPERATIONS_BACKUP_RESTORE.md](OPERATIONS_BACKUP_RESTORE.md) |
| Load/stress test profile và quy trình k6                        | [LOAD_TESTING.md](LOAD_TESTING.md)                           |
| Đánh giá/phạm vi readiness của source                           | [PRODUCTION_READINESS_PLAN.md](PRODUCTION_READINESS_PLAN.md) |

## Đọc theo vai trò

- Developer mới: Quick Start → Project Guide → API Summary.
- Tạo service từ base: Project Guide → Configuration Guide → Database Setup;
  sau đó tắt/loại bỏ domain mẫu theo nhu cầu.
- Release owner: Configuration Guide → Deployment → Backup/Restore → Readiness Plan.

Swagger UI tại `/api-docs` chỉ khả dụng khi `SWAGGER_ENABLED=true` và credentials được
cấu hình; mặc định Swagger tắt. Trong trường hợp tài liệu cũ khác với source hiện
tại, ưu tiên configuration validation, controller decorators, tests và migrations.
