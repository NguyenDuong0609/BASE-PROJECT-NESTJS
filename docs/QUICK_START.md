# Bắt đầu nhanh

Hướng dẫn này chạy NestJS trên máy host và chỉ dùng Docker cho PostgreSQL/Redis.
Các lệnh shell dưới đây dùng PowerShell trên Windows; npm và Docker commands cũng
có thể chạy từ terminal tương ứng trên Linux/macOS.

## Yêu cầu

- Node.js `>=24.15.0` (dùng cùng major khi cài dependency, build và chạy).
- npm đi kèm Node.js và Docker Desktop/Engine đang hoạt động.

## 1. Cài đặt dependency và cấu hình môi trường local

```powershell
npm ci
Copy-Item .env.example .env.dev
```

Sửa `.env.dev`:

- Đổi `DB_PASSWORD` sang mật khẩu local của bạn. Compose publish PostgreSQL ở
  loopback port `5433`; Redis ở `6379`.
- Thay cả hai JWT secrets bằng hai giá trị khác nhau, ngẫu nhiên, ít nhất 32 ký tự.
- Đặt `FRONTEND_URL` và `CORS_ORIGINS` theo frontend local thực tế.
- Swagger mặc định tắt. Nếu cần UI, đặt `SWAGGER_ENABLED=true`, thêm username và
  mật khẩu ít nhất 16 ký tự.
- Không cần cấu hình AWS, Google OAuth hay SMTP khi chưa bật các tính năng tương ứng.

Tạo JWT secrets ngẫu nhiên bằng Node:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Chạy lệnh hai lần và gán riêng cho `JWT_ACCESS_TOKEN_SECRET` và
`JWT_REFRESH_TOKEN_SECRET`. `.env.dev` không được commit.

## 2. Khởi động database/Redis và chạy migration

```powershell
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d postgres_db redis
$env:NODE_ENV = 'development'
npm run migration:run
```

Migration CLI chạy trên host và đọc `.env.dev` khi `NODE_ENV=development`; gán biến
ở trên trước khi chạy migration.
PostgreSQL được expose local ở `localhost:5433`; bên trong Compose network dùng
service `postgres_db:5432`. Redis dùng `localhost:6379` trên host và `redis:6379`
trong Compose.

## 3. Chạy API và tìm hiểu các endpoint

```powershell
npm run start:dev
```

- API: `http://localhost:3000`
- Liveness: `http://localhost:3000/health/live`
- Readiness (PostgreSQL và Redis): `http://localhost:3000/health/ready`
- Swagger: `http://localhost:3000/api-docs` nếu đã bật và bảo vệ bằng Basic Auth.
- Import `postman_collection.json` và `postman_environment.json` để thử API; xem
  [API Testing Guide](API_TESTING_GUIDE.md) để bật domain mẫu và tạo collection từ Swagger.

`GET /` là welcome endpoint. Hầu hết JSON API responses dùng response envelope
được mô tả trong [API Response Contract](API_RESPONSE_CONTRACT.md). Danh sách route
hiện tại nằm ở [API Summary](API_SUMMARY.md).

## 4. Phát triển và kiểm thử

```powershell
npm run build
npm test -- --runInBand
npm run lint
npm run test:e2e
npm audit
```

Unit tests dùng `pg-mem` khi cần database giả. E2E khởi tạo `AppModule` thật và cần
PostgreSQL/Redis cùng biến môi trường hợp lệ. Dùng lệnh migration trước khi kiểm tra
trên database mới.

## 5. Tạo một domain mới

```powershell
npx nest g resource modules/products
```

Chọn REST API và CRUD nếu phù hợp. Sau khi tạo:

1. Viết DTO có validation decorators; giữ controller tập trung vào HTTP/authorization.
2. Đặt business rules ở service; dùng repository/TypeORM để thao tác dữ liệu.
3. Đăng ký module/entity theo pattern hiện tại; TypeORM dùng `autoLoadEntities`.
4. Tạo và review migration, không bật `synchronize` để thay schema.
5. Kiểm tra ownership/RBAC cho mọi thao tác theo ID; thêm unit và HTTP/e2e tests.
6. Dùng `@ApiSuccessMessage` và `ApiException`/Nest exceptions theo
   [API Response Contract](API_RESPONSE_CONTRACT.md).

Ví dụ quy trình entity → migration:

```powershell
npm run migration:generate -- src/database/migrations/CreateProducts
npm run migration:show
npm run migration:run
```

Luôn đọc lại SQL TypeORM sinh ra và thử migration trên database development mới.
Không revert migration đã áp dụng production để sửa schema; tạo migration tiến
thêm và lập kế hoạch tương thích dữ liệu.

## Dọn dẹp môi trường local

```powershell
docker compose --env-file .env.dev -f docker-compose.dev.yml down
```

Chỉ dùng `down -v` nếu chủ động muốn xóa dữ liệu local trong volumes.
Xem [Configuration Guide](CONFIGURATION_GUIDE.md) và [Deployment Guide](DEPLOYMENT.md)
cho provider tùy chọn và production Compose.
