# Hướng dẫn phát triển Local

Hướng dẫn chi tiết để thiết lập và chạy dự án trên máy local cho mục đích phát triển.

## Yêu cầu

- Node.js >= 24.15.0
- npm (đi kèm Node.js)
- Docker Desktop/Engine
- Git

## 1. Cài đặt dependencies

```powershell
# Clone repository
git clone <repository-url>
cd nguyenduong864-beep-shiny-couscous

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

### Tùy chọn (nếu cần Swagger)

```env
SWAGGER_ENABLED=true
SWAGGER_USERNAME=local-docs
SWAGGER_PASSWORD=replace-with-at-least-16-characters
```

## 3. Khởi động Database và Redis

```powershell
# Chỉ khởi động PostgreSQL và Redis
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d postgres_db redis
```

**Kiểm tra trạng thái:**

```powershell
docker compose -f docker-compose.dev.yml ps
```

Kết quả dự kiến:
```
NAME           STATUS
postgres_db    Up (healthy)
redis          Up (healthy)
```

## 4. Chạy Migration

```powershell
# Set NODE_ENV để migration CLI đọc .env.dev
$env:NODE_ENV = 'development'

# Chạy migration
npm run migration:run
```

**Kiểm tra migration:**

```powershell
npm run migration:show
```

## 5. Chạy Application

```powershell
# Development mode với hot reload
npm run start:dev
```

Application sẽ chạy ở `http://localhost:3000`

## 6. Xác minh hoạt động

### Health checks

```powershell
# Liveness
Invoke-RestMethod http://localhost:3000/health/live

# Readiness (kiểm tra PostgreSQL và Redis)
Invoke-RestMethod http://localhost:3000/health/ready
```

### Access Swagger (nếu đã bật)

Truy cập: `http://localhost:3000/api-docs`

Đăng nhập với:
- Username: `local-docs`
- Password: (giá trị `SWAGGER_PASSWORD` trong `.env.dev`)

## 7. Công cụ phát triển

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

# Security audit
npm audit
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

## 8. Cấu trúc dự án

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

## 9. Workflow phát triển

### Tạo feature mới

```powershell
# Tạo module mới với NestJS CLI
npx nest g resource modules/feature-name

# Hoặc thủ công:
# 1. Tạo entity
# 2. Generate migration
# 3. Run migration
# 4. Tạo DTO
# 5. Tạo service
# 6. Tạo controller
# 7. Đăng ký module
```

### Thay đổi database schema

1. Sửa entity
2. Generate migration
3. Review SQL
4. Test migration trên database local
5. Commit migration với code

### Debug

```powershell
# Run với debug mode
npm run start:debug

# Hoặc dùng VS Code debugger
# Tạo launch config trong .vscode/launch.json
```

## 10. Dọn dẹp

### Dừng services

```powershell
# Dừng và giữ data
docker compose -f docker-compose.dev.yml down

# Dừng và xóa data volumes
docker compose -f docker-compose.dev.yml down -v
```

### Xóa node_modules

```powershell
# Windows
Remove-Item -Recurse -Force node_modules

# Linux/Mac
rm -rf node_modules
```

## 11. Port mapping

Khi chạy local:

| Service | Host Port | Container Port | Access |
|---------|-----------|----------------|--------|
| API | 3000 | 3000 | http://localhost:3000 |
| PostgreSQL | 5433 | 5432 | localhost:5433 |
| Redis | 6379 | 6379 | localhost:6379 |
| Swagger (nếu bật) | 3000 | 3000 | http://localhost:3000/api-docs |

## 12. Troubleshooting

### Port đã được sử dụng

```powershell
# Tìm process đang dùng port
netstat -ano | findstr ":3000"

# Kill process hoặc đổi port trong .env.dev
```

### Migration thất bại

```powershell
# Xem log migration
npm run migration:show

# Kiểm tra database connection
docker logs postgres_db
```

### Docker không chạy

```powershell
# Kiểm tra Docker status
docker ps

# Restart Docker Desktop
```

### TypeORM sync error

Kiểm tra `DB_HOST` trong `.env.dev`:
- Khi chạy migration từ host: `localhost`
- Khi chạy trong Docker: `postgres_db`

## 13. Mẹo

- **Hot reload**: Chỉnh sửa code trong `src/` sẽ tự động reload
- **Environment**: Luôn dùng `.env.dev` cho local, không commit
- **Secrets**: Không bao giờ commit secrets thật
- **Testing**: Run test trước khi commit
- **Migration**: Review migration SQL trước khi apply

## Tài liệu liên quan

- [Docker Setup](docker-setup.md)
- [Configuration](../05-CAU-HINH/environment-variables.md)
- [Architecture](../02-CODE-CHUC-NANG/architecture.md)
