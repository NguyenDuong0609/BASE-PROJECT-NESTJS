# Hướng dẫn cấu hình

Configuration được validate bằng Joi tại `src/configs/validation.schema.ts` và
được ánh xạ sang object lồng nhau trong `src/configs/configuration.config.ts`.
Application và TypeORM CLI đọc `.env.dev` khi `NODE_ENV=development`; các môi trường
khác, bao gồm `staging`, đọc `.env` (không tự tìm `.env.staging`). Docker Compose
nhận file chỉ định qua `--env-file` và inject các biến đã khai báo trong Compose
service. Có thể cấp cấu hình staging qua environment của runtime hoặc chọn file env
phù hợp ở lớp chạy ứng dụng.

## Thiết lập môi trường

Development:

```powershell
Copy-Item .env.example .env.dev
```

Sửa database credentials và thay JWT secrets bằng 2 giá trị ngẫu nhiên khác nhau,
mỗi giá trị tối thiểu 32 ký tự. Không commit `.env.dev`, `.env` hoặc `.env.prod`.
Tạo secret local bằng:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

## Biến môi trường cốt lõi

| Biến                                        | Bắt buộc / mặc định             | Ghi chú                                                                                        |
| ------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                  | `development`                   | `development`, `staging`, `production`, `test`                                                 |
| `PORT`                                      | `3000`                          | Cổng API                                                                                       |
| `TRUST_PROXY_HOPS`                          | `0`                             | Số reverse-proxy hop tin cậy để Express xác định client IP; chỉ tăng theo topology thực tế     |
| `LOG_LEVEL`                                 | `debug` dev / `info` production | Mức log Pino: `fatal`, `error`, `warn`, `info`, `debug`, `trace`                               |
| `LOG_FORMAT`                                | `pretty` dev / JSON production  | `pretty` hoặc `json`; đặt `json` khi thu log development vào Grafana/Loki                      |
| `FRONTEND_URL`                              | Bắt buộc                        | URI frontend; production yêu cầu HTTPS                                                         |
| `CORS_ORIGINS`                              | rỗng                            | Danh sách origin phân tách dấu phẩy, không dùng wildcard; credentials chỉ bật khi có allowlist |
| `DB_HOST`                                   | Bắt buộc                        | Host PostgreSQL; trong Compose là `postgres_db`                                                |
| `DB_PORT`                                   | `5432`                          | Compose dev host publish `5433`, container dùng `5432`                                         |
| `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | Bắt buộc                        | Database credentials                                                                           |
| `DB_LOGGING`                                | `false`                         | Không bật SQL logging trên production nếu chưa đánh giá dữ liệu log                            |
| `DB_POOL_SIZE`                              | `10`                            | `1..100`, điều chỉnh theo connection budget tổng replicas                                      |
| `DB_CONNECTION_TIMEOUT_MS`                  | `5000`                          | Connection timeout, tối thiểu 100 ms                                                           |
| `DB_QUERY_TIMEOUT_MS`                       | `15000`                         | Query timeout, tối thiểu 100 ms                                                                |
| `REDIS_HOST`                                | `localhost`                     | Compose dùng `redis`                                                                           |
| `REDIS_PORT`                                | `6379`                          | Redis port                                                                                     |
| `REDIS_PASSWORD`                            | rỗng ở non-production           | Production bắt buộc tối thiểu 16 ký tự base64url                                               |
| `REDIS_DB`                                  | `0`                             | Redis logical DB                                                                               |
| `APP_CACHE_PREFIX`                          | `nestjs-base`                   | Prefix riêng cho application cache; đặt khác nhau nếu nhiều app dùng chung Redis DB            |
| `ENABLE_PGAUDIT`                            | `false` config / `true` Compose | Cho migration cài extension; Compose PostgreSQL bật audit write/DDL/role                        |
| `JWT_ACCESS_TOKEN_SECRET`                   | Bắt buộc                        | Tối thiểu 32 ký tự; production từ chối các placeholder thông dụng                              |
| `JWT_REFRESH_TOKEN_SECRET`                  | Bắt buộc                        | Tối thiểu 32 ký tự; dùng secret độc lập với access token                                       |
| `JWT_ACCESS_TOKEN_EXPIRATION`               | `15m`                           | Định dạng số + `s/m/h/d/w/y`                                                                   |
| `JWT_REFRESH_TOKEN_EXPIRATION`              | `7d`                            | Định dạng số + `s/m/h/d/w/y`                                                                   |
| `MAX_FILE_SIZE`                             | `10485760`                      | Byte; giới hạn config tối đa 100 MiB                                                           |
| `ALLOWED_FILE_TYPES`                        | Tùy chọn                        | Danh sách MIME được phép; route cũng áp dụng kiểm tra upload theo code                         |

### Lưu ý riêng cho staging

`NODE_ENV=staging` và `NODE_ENV=production` cùng áp dụng các ràng buộc cho JWT
secrets, Redis password, HTTPS `FRONTEND_URL` và Swagger tắt.

## Feature flags

| Biến                          | Mặc định | Tác động                                                                     |
| ----------------------------- | -------- | ---------------------------------------------------------------------------- |
| `ENABLE_FLASH_CARDS`          | `false`  | Bật route flash cards mẫu                                                    |
| `ENABLE_COLLECTIONS`          | `false`  | Bật route collections mẫu                                                    |
| `ENABLE_TOPICS`               | `false`  | Bật route topics mẫu                                                         |
| `ENABLE_CHECKIN`              | `false`  | Bật route check-in mẫu                                                       |
| `ENABLE_COMMENTS`             | `false`  | Bật route comments mẫu                                                       |
| `ENABLE_FLASH_CARD_STATES`    | `false`  | Bật route workflow mẫu                                                       |
| `ENABLE_STUDENT_CARD_UPLOADS` | `false`  | Stub còn trả 501 khi bật; không bật trước khi implement storage/verification |
| `ENABLE_METRICS`              | `false`  | Bật endpoint Prometheus `GET /metrics`                                       |
| `ENABLE_ACCOUNT_EMAIL_FLOWS`  | `false`  | Bật reset password và email verification                                     |
| `REQUIRE_VERIFIED_EMAIL`      | `false`  | Bắt buộc bật account email flows; chặn tài khoản chưa verified               |
| `ENABLE_S3`                   | `false`  | Bật tích hợp S3 sau khi cấu hình credentials/bucket                          |
| `ENABLE_GOOGLE_OAUTH`         | `false`  | Bật Google OAuth sau khi đăng ký credentials/callback                        |

Domain mẫu vẫn được giữ trong source để dự án có thể bật/tái sử dụng; mặc định chỉ
các route của domain mẫu bị ẩn bằng HTTP 404. Flag hiện không gỡ module/database
schema khỏi runtime; muốn loại bỏ hoàn toàn một domain và các quan hệ/migration của
nó thì cần xóa domain tương ứng trong fork. Xem [Project Guide](PROJECT_GUIDE.md).

### Audit dashboard (optional)

`GRAFANA_ADMIN_USER` mặc định `admin`; phải đặt `GRAFANA_ADMIN_PASSWORD` mạnh trước
khi bật profile `audit-ui`. Profile Grafana/Loki/Alloy được khai báo ở
`docker-compose.audit.yml`; cách chạy và retention xem [Audit Guide](AUDIT_GUIDE.md).

## Provider tùy chọn

### SMTP cho account lifecycle

Chỉ yêu cầu khi `ENABLE_ACCOUNT_EMAIL_FLOWS=true`:

| Biến                         | Giá trị                                |
| ---------------------------- | -------------------------------------- |
| `SMTP_HOST`                  | Bắt buộc                               |
| `SMTP_PORT`                  | `587`                                  |
| `SMTP_SECURE`                | `false`                                |
| `SMTP_FROM_EMAIL`            | Bắt buộc, địa chỉ email hợp lệ         |
| `SMTP_FROM_NAME`             | `Application`                          |
| `SMTP_USER`, `SMTP_PASSWORD` | Tùy chọn, nhưng phải cấu hình theo cặp |

`REQUIRE_VERIFIED_EMAIL=true` cũng yêu cầu `ENABLE_ACCOUNT_EMAIL_FLOWS=true`, host
SMTP và sender. SMTP account lifecycle không tự cấu hình processor email của BullMQ.

### AWS S3

Khi `ENABLE_S3=true`, cần `AWS_REGION` và `AWS_S3_BUCKET`. Cấu hình
`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` theo cặp nếu dùng key; ưu tiên workload
identity/role phù hợp với nền tảng triển khai. Không commit credentials.

### Google OAuth

Khi `ENABLE_GOOGLE_OAUTH=true`, cần `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` và
`GOOGLE_CALLBACK_URL` dạng URI. Callback URL phải khớp chính xác cấu hình provider
và ứng dụng frontend.

### Swagger

`SWAGGER_ENABLED` mặc định `false`. Khi bật, cần `SWAGGER_USERNAME` và
`SWAGGER_PASSWORD` tối thiểu 16 ký tự. Validation production buộc Swagger off;
không thay đổi guard/proxy controls để phơi Swagger production công khai.

## Production requirements và kiểm tra

Production yêu cầu JWT secrets không phải placeholder, Redis password đủ mạnh,
HTTPS `FRONTEND_URL`; Swagger phải tắt. Thay secret bằng secret manager của nền
tảng, không lưu trong image hoặc source. Các giá trị S3, OAuth, account mail và
feature flags được Compose chuyển sang API từ `.env.prod`; xem
[Deployment Guide](DEPLOYMENT.md).

```powershell
docker compose --env-file .env.prod -f docker-compose.prod.yml config --quiet
npm run build
npm run lint
npm test -- --runInBand
npm audit
```
