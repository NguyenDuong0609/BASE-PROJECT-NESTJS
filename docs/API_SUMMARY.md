# Tóm tắt API

Danh mục route được tổng hợp từ controllers hiện tại. Khi có khác biệt, Swagger
được sinh từ source và decorators là mô tả chi tiết nhất về schema, status và
authorization. Tất cả route chạy dưới origin API, ví dụ `http://localhost:3000`.

## Xác thực

| Method | Route                              | Chức năng                                              | Truy cập                             |
| ------ | ---------------------------------- | ------------------------------------------------------ | ------------------------------------ |
| POST   | `/auth/sign-up`                    | Đăng ký bằng email/password                            | Public, throttled                    |
| POST   | `/auth/sign-in`                    | Đăng nhập; trả token                                   | Public, throttled                    |
| POST   | `/auth/refresh`                    | Luân chuyển token bằng refresh credential              | Refresh token                        |
| POST   | `/auth/logout`                     | Thu hồi refresh session và xóa auth cookies            | Refresh token                        |
| GET    | `/auth/google`                     | Bắt đầu Google OAuth                                   | Chỉ hoạt động khi cấu hình/bật OAuth |
| GET    | `/auth/google/callback`            | Xử lý OAuth callback, set cookies và redirect frontend | OAuth callback                       |
| GET    | `/auth/csrf-token`                 | Cấp cookie/token CSRF cho client dùng auth cookie      | Public                               |
| POST   | `/auth/password-reset/request`     | Gửi email đặt lại nếu account tồn tại                  | Public; account email flows bật      |
| POST   | `/auth/password-reset/confirm`     | Đặt password bằng token một lần                        | Public; account email flows bật      |
| POST   | `/auth/email-verification/request` | Gửi link xác minh email                                | Public; account email flows bật      |
| POST   | `/auth/email-verification/confirm` | Xác minh email bằng token                              | Public; account email flows bật      |

Account email flows dùng SMTP tùy chọn; token raw chỉ được gửi qua email, database
chỉ lưu hash. Khi bật `REQUIRE_VERIFIED_EMAIL`, signup yêu cầu mail flows đã bật.
Auth controller áp dụng rate limit theo endpoint; cấu hình throttle nằm trong
`AuthController` và throttler global. Bộ đếm rate limit toàn ứng dụng được lưu
trong Redis, dùng chung giữa các replicas. Client sử dụng auth cookie cần gọi
`GET /auth/csrf-token`, gửi cookie CSRF kèm header `x-csrf-token` giống token
trả về cho mọi request thay đổi dữ liệu, và gửi `Origin` thuộc allowlist.

## Người dùng và vai trò

| Method | Route                  | Chức năng                                          | Truy cập                                                                 |
| ------ | ---------------------- | -------------------------------------------------- | ------------------------------------------------------------------------ |
| POST   | `/users`               | Admin tạo user                                     | Admin                                                                    |
| GET    | `/users`               | Danh sách user, `offset`/`limit`                   | Admin                                                                    |
| GET    | `/users/:id`           | Đọc user                                           | Chủ tài khoản hoặc admin                                                 |
| PATCH  | `/users/:id`           | Cập nhật user                                      | Chủ tài khoản hoặc admin, theo field policy                              |
| DELETE | `/users/:id`           | Xóa user                                           | Admin                                                                    |
| POST   | `/users/student-cards` | Stub upload thẻ sinh viên, chưa triển khai storage | Admin; flag `ENABLE_STUDENT_CARD_UPLOADS`, mặc định off; nếu bật trả 501 |
| POST   | `/user-roles`          | Tạo role                                           | Admin                                                                    |
| GET    | `/user-roles`          | Liệt kê roles                                      | Admin                                                                    |
| GET    | `/user-roles/:id`      | Đọc role                                           | Admin                                                                    |
| PATCH  | `/user-roles/:id`      | Sửa role                                           | Admin                                                                    |
| DELETE | `/user-roles/:id`      | Xóa role                                           | Admin                                                                    |

## Domain mẫu

Các module Flash Cards/domain mẫu vẫn có trong source nhưng route bị tắt mặc định.
Có thể bật route theo module bằng biến `ENABLE_*` tương ứng; feature flag không gỡ
module, bảng hay migration. Một route bị flag tắt trả `404`.

| Method             | Route                                        | Chức năng                                                                      |
| ------------------ | -------------------------------------------- | ------------------------------------------------------------------------------ |
| POST, GET          | `/topics`                                    | Tạo topic / liệt kê topics                                                     |
| GET, PATCH, DELETE | `/topics/:id`                                | Đọc, sửa, xóa topic                                                            |
| POST, GET          | `/collections`                               | Tạo collection / liệt kê và lọc collections                                    |
| GET, PATCH, DELETE | `/collections/:id`                           | Đọc, sửa, xóa collection                                                       |
| POST, GET          | `/flash-cards`                               | Tạo / liệt kê flash cards                                                      |
| GET, PATCH, DELETE | `/flash-cards/:id`                           | Đọc, sửa, xóa flash card                                                       |
| POST, GET          | `/flash-cards-state`                         | Tạo draft / liệt kê workflow cards                                             |
| GET, PATCH         | `/flash-cards-state/:id`                     | Đọc card / sửa nội dung draft theo rule state                                  |
| POST               | `/flash-cards-state/:id/submit`              | Gửi card vào review                                                            |
| POST               | `/flash-cards-state/:id/approve`             | Phê duyệt theo trạng thái/vai trò                                              |
| POST               | `/flash-cards-state/:id/reject`              | Từ chối theo trạng thái/vai trò                                                |
| POST               | `/flash-cards-state/:id/publish`             | Xuất bản theo trạng thái/vai trò                                               |
| GET                | `/flash-cards-state/:id/transitions`         | Lịch sử chuyển state                                                           |
| GET                | `/flash-cards-state/:id/allowed-transitions` | Chuyển state được phép                                                         |
| POST               | `/comments/posts/:postId`                    | Tạo comment gốc                                                                |
| POST               | `/comments/:commentId/replies`               | Tạo reply                                                                      |
| GET                | `/comments/posts/:postId/tree`               | Lấy cây comment theo trang các comment gốc (`offset`, `limit`, tối đa 100 gốc) |
| GET                | `/comments/:id/ancestors`                    | Lấy ancestor comments                                                          |
| GET                | `/comments/:id/descendants`                  | Lấy descendant comments                                                        |
| PATCH, DELETE      | `/comments/:id`                              | Sửa/xóa comment theo ownership policy                                          |
| POST               | `/checkin`                                   | Check-in hằng ngày                                                             |
| GET                | `/checkin/history`                           | Lịch sử check-in                                                               |
| GET                | `/checkin/stats`                             | Thống kê chuỗi ngày và phần thưởng                                             |
| GET                | `/checkin/status`                            | Trạng thái hôm nay                                                             |

Feature flags: `ENABLE_TOPICS`, `ENABLE_COLLECTIONS`, `ENABLE_FLASH_CARDS`,
`ENABLE_FLASH_CARD_STATES`, `ENABLE_COMMENTS`, `ENABLE_CHECKIN`. Mỗi module có
authorization/ownership policy riêng; kiểm tra Swagger và controller/service trước
khi tích hợp route vào client.

## Media và queue nền

| Method | Route                       | Chức năng                                   | Điều kiện                            |
| ------ | --------------------------- | ------------------------------------------- | ------------------------------------ |
| POST   | `/media/upload`             | Upload media, kiểm tra giới hạn và nội dung | Cấu hình storage/provider thích hợp  |
| GET    | `/media/:id`                | Metadata theo quyền truy cập                | Auth/ownership                       |
| GET    | `/media/:id/download`       | Presigned download URL                      | Cần S3 thực được cấu hình            |
| DELETE | `/media/:id`                | Xóa media theo quyền truy cập               | Cần storage/provider thích hợp       |
| GET    | `/queues/:name/status`      | Thống kê queue                              | Internal/admin policy của controller |
| GET    | `/queues/:name/jobs/:jobId` | Trạng thái một job                          | Internal/admin policy của controller |

S3 mặc định tắt. Processor mẫu không giả lập thành công ở production; queue cần
provider, idempotency, timeout và side-effect policy của dự án trước khi dùng cho
nghiệp vụ thật.

## Audit log

Audit events được ghi vào PostgreSQL `audit_events`; quản trị viên có thể lọc bằng
`GET /audit/events` (Admin, JWT) theo `eventType`, `action`, `userId`,
`resourceType`, `resourceId`, `limit` và `offset`. Các route tương thích
`GET /audit/user` và `GET /audit/resource` cũng được mount.

Pino ghi access log của request ra stdout; pgAudit ghi SQL write/DDL/role vào log
PostgreSQL. Xem dashboard cục bộ/production qua Grafana; hướng dẫn và giới hạn xem
[`AUDIT_GUIDE.md`](AUDIT_GUIDE.md).

## Endpoint nền tảng

| Method | Route           | Ý nghĩa                                            |
| ------ | --------------- | -------------------------------------------------- |
| GET    | `/`             | Thông điệp chào mừng                               |
| GET    | `/health`       | Liveness alias để tương thích                      |
| GET    | `/health/live`  | Liveness của process                               |
| GET    | `/health/ready` | Readiness, kiểm tra PostgreSQL và Redis            |
| GET    | `/metrics`      | Prometheus text metrics; cần `ENABLE_METRICS=true` |

Metrics không có application-level authentication; giới hạn mạng/proxy/scraper
trước khi bật trong môi trường dùng chung.

## Xác thực, response và Swagger

- Route được chỉ định `@Public()` hoặc OAuth callback có public flow; các route khác
  chịu global feature/throttling và auth guards ở module/controller/handler. Quyền
  cuối cùng do decorators, guards, service ownership checks quyết định.
- Request thành công/lỗi JSON dùng envelope chuẩn hóa:
  [API Response Contract](API_RESPONSE_CONTRACT.md). OAuth callback redirect và
  metrics text là response không theo JSON envelope thông thường.
- Swagger mặc định tắt; bật với `SWAGGER_ENABLED=true` và thông tin bảo vệ được
  validate. Tại local, UI ở `/api-docs`, OpenAPI JSON ở `/api-docs-json`.
  Collection Postman và hướng dẫn tạo/import nằm tại
  [API Testing Guide](API_TESTING_GUIDE.md).
