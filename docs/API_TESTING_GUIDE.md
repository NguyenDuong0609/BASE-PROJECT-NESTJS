# Swagger, Postman và kiểm thử API

Tài liệu này hướng dẫn build/chạy API local, bật các route domain mẫu, khám phá
schema bằng Swagger, sinh/import Postman collection và diễn giải giới hạn của các
ca kiểm thử. Các credentials/data trong ví dụ chỉ dùng local.

## Chạy một stack local cô lập

Yêu cầu Node.js `>=24.15.0` và Docker. Bắt đầu từ cấu hình mẫu:

```powershell
npm ci
Copy-Item .env.example .env.dev
```

Đổi `DB_PASSWORD`, hai JWT secrets và Swagger password trong `.env.dev`. Bật
Swagger và domain mẫu cần kiểm thử:

```dotenv
SWAGGER_ENABLED=true
SWAGGER_USERNAME=local-docs
SWAGGER_PASSWORD=replace-with-at-least-16-characters
ENABLE_FLASH_CARDS=true
ENABLE_COLLECTIONS=true
ENABLE_TOPICS=true
ENABLE_CHECKIN=true
ENABLE_COMMENTS=true
ENABLE_FLASH_CARD_STATES=true
ENABLE_METRICS=true
ENABLE_S3=false
ENABLE_GOOGLE_OAUTH=false
ENABLE_ACCOUNT_EMAIL_FLOWS=false
```

Khởi động dependency, migrate và chạy API:

```powershell
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d postgres_db redis
$env:NODE_ENV = "development"
npm run migration:run
npm run build
npm run start:dev
```

Với cấu hình mặc định: API `http://localhost:3000`, Swagger UI
`http://localhost:3000/api-docs`, OpenAPI JSON
`http://localhost:3000/api-docs-json`. Swagger UI và JSON đều yêu cầu Basic Auth
bằng username/password cấu hình ở `.env.dev`. Swagger tắt trong production.

Kiểm tra dịch vụ:

```powershell
Invoke-RestMethod http://localhost:3000/health/live
Invoke-RestMethod http://localhost:3000/health/ready
```

`/health/ready` yêu cầu PostgreSQL và Redis. `/metrics` chỉ xuất hiện khi
`ENABLE_METRICS=true`. Endpoint có module domain mẫu bị tắt sẽ trả `404`.

## Sinh và import Postman collection

`postman_collection.json` được tạo từ OpenAPI đang chạy, gồm các operation hiện
được Swagger công bố, ví dụ request bodies, query/path parameters và bearer auth.
Sinh lại sau khi đổi DTO, controller, feature flags hoặc Swagger:

```powershell
$env:OPENAPI_URL = "http://localhost:3000/api-docs-json"
$env:SWAGGER_USERNAME = "local-docs"
$env:SWAGGER_PASSWORD = "replace-with-at-least-16-characters"
npm run postman:generate
```

`OPENAPI_URL` mặc định là `http://localhost:3000/api-docs-json`. Script yêu cầu
cả hai biến Swagger credentials nếu một trong hai được khai báo. Nó lấy route và
request schema từ live OpenAPI, sau đó ghi `postman_collection.json`.

Import cả `postman_collection.json` và `postman_environment.json` vào Postman, chọn
environment **NestJS Base API - Local**, xác nhận `base_url` và `frontend_origin`
(phải khớp một origin trong `CORS_ORIGINS` hoặc `FRONTEND_URL` của API), rồi chạy
**Sign Up** hoặc **Sign In** trước các request có bearer auth nếu chạy thủ công.
Với client dùng auth cookie, gọi `GET /auth/csrf-token` trước request thay đổi
dữ liệu và gửi giá trị `csrfToken` trả về trong header `x-csrf-token`; cookie
CSRF phải được giữ/gửi tự động cùng request. Bearer-only clients không cần CSRF
token.
Environment đi kèm trỏ tới stack Docker validation tại `http://localhost:3317`;
nếu chạy API bằng `npm run start:dev` với port mặc định, đổi `base_url` thành
`http://localhost:3000`.
Trong Collection Runner, nhóm Auth được xếp đầu để lấy token trước các nhóm khác.
Script tự lưu `access_token`/`refresh_token` vào environment và collection
variables; `/auth/refresh` và `/auth/logout` dùng `refresh_token`. ID từ response
cũng được lưu vào cả hai scope. Với request tạo reply, `post_id` trong body phải
là ID của post chứa comment. Nếu chạy request ngoài thứ tự hoặc cần kiểm tra
resource cụ thể, hãy cập nhật biến ID tương ứng trong environment/collection
variables. Các request thay đổi dữ liệu gửi
`Origin: {{frontend_origin}}` để khớp kiểm tra cookie-auth phía API. Các route
Admin yêu cầu tài khoản có role Admin, còn signup tạo tài khoản User mặc định.

Ví dụ bodies quan trọng đã được khai báo tại DTO `@ApiProperty`, `@ApiBody`:

```json
{
	"first_name": "Api",
	"last_name": "Tester",
	"email": "api.tester@example.test",
	"password": "ExamplePass123!"
}
```

```json
{
	"title": "NestJS basics",
	"question": "What framework is used by this API?",
	"answer": "NestJS"
}
```

Multipart requests có trường file ở trạng thái chưa chọn. Flash Card và media
upload cần chọn file hợp lệ; ảnh của collection là tuỳ chọn. OAuth Google và
account-email flows cần provider thật để xác nhận end-to-end; trong cấu hình kiểm
thử này chúng tắt hoặc không có credentials. `student-cards` là stub và chủ đích
trả `501` nếu bật.

## Thứ tự smoke-test gợi ý

1. `GET /`, `/health/live`, `/health/ready`; khi metrics bật, đọc `GET /metrics`.
2. `POST /auth/sign-up`, sau đó `POST /auth/sign-in`; collection tự cập nhật JWT.
3. Với user đã đăng nhập, thử profile và các route domain bật: tạo topic, collection
   (không gửi image), flash-card state, comment và check-in; dùng ID trả về cho
   request đọc/sửa/xóa liên quan.
4. Dùng tài khoản Admin riêng để kiểm tra user/role CRUD và queue monitoring.
   Không nâng quyền tài khoản thật trong DB dùng chung. Xóa role đang được gán cho
   user sẽ trả `409 Conflict`; chỉ xóa role không còn được tham chiếu.
5. Với email flows bật và SMTP test server cấu hình, kiểm tra request/confirm bằng
   token trong email test; không dùng email người dùng thật.
6. Thử invalid input, thiếu token, ID không tồn tại và resource không thuộc user
   nhằm kiểm tra validation, 401/403/404 và response envelope.

`GET /auth/google` chuyển hướng tới Google; callback cần phiên OAuth thật.
`GET /media/:id/download` cần file trong metadata storage và S3 tương ứng.
Collection cung cấp request mẫu nhưng không tự tạo dịch vụ bên ngoài, role Admin
hay seed data.

## Build, unit và e2e

```powershell
npm run build
npm run lint
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

E2E cần `.env.dev` hợp lệ, PostgreSQL/Redis đang chạy và migration đã áp dụng.
Smoke-test HTTP/Postman bổ sung kiểm tra tích hợp trên runtime thật; kết quả kiểm
thử được ghi trong [Docker API Test Report](DEV_DOCKER_API_TEST_REPORT.md).

## API artifacts

- [API Summary](API_SUMMARY.md): route, feature flag và authorization theo source.
- [API Response Contract](API_RESPONSE_CONTRACT.md): JSON envelope, lỗi và success
  messages.
- `postman_collection.json`: collection sinh từ Swagger.
- `postman_environment.json`: biến môi trường mẫu, không chứa secrets.
