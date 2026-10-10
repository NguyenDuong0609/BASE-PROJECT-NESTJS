# Báo cáo kiểm thử Docker development và API

**Ngày kiểm thử:** 2026-10-05<br>
**Phạm vi:** Build Docker, khởi chạy môi trường dev, migration PostgreSQL và kiểm
thử các API được công bố trong OpenAPI. Đây là kiểm thử trên dữ liệu giả trong môi
trường Docker cô lập; không phải kiểm thử production hay kiểm thử tải.

Phần kết quả API bên dưới là baseline trước các thay đổi hardening. Kết quả kiểm tra
sau hardening được ghi ở cuối tài liệu; không coi các status/API của baseline là kết
quả retest sau thay đổi.

Phạm vi đánh giá production readiness của source là application code, không phải
nghiệm thu DevOps. Các lưu ý về staging, backup/restore, deployment, load test và
provider credentials mô tả giới hạn lần kiểm thử hoặc trách nhiệm của dự án sử dụng
base; chúng không phải blocker để source tự thân được xem là application base.

## Tóm tắt

| Hạng mục | Kết quả |
|---|---|
| Docker Desktop | Hoạt động — Engine 29.8.1, Compose 5.5.1 |
| Validate Compose | Thành công |
| Build image `flash_cards_api_dev:1.0.0` | Thành công; bước `npm run build` trong Docker hoàn tất |
| Khởi chạy dev stack | API lên; PostgreSQL healthy; Redis running |
| Database migration | Thành công — `InitialSchema1700000000000`; `migration:show` xác nhận đã áp dụng |
| OpenAPI operations | 60 method/path được tìm thấy; tất cả route shapes đã được gọi ít nhất một lần |
| API smoke/workflow | Phần lớn hoạt động với dịch vụ local; có lỗi chức năng và phân quyền quan trọng bên dưới |
| Tích hợp bên ngoài | Chưa xác nhận thành công với Google OAuth, AWS S3 hoặc nhà cung cấp email/notification thật |

Các container cũ `postgres_db`, `redis`, `flash_cards_api_dev` thuộc project
`project_base_nestjs` và checkout chính. Để không thay thế container hay volume của
checkout đó, lần kiểm thử này dùng project riêng `bp_validation`, container/volume
riêng, API trên port `3317`, và không publish port PostgreSQL/Redis ra host. Tên
container, project và dữ liệu thử không dùng chung với stack cũ.

## Kết quả theo API

Mỗi nhóm dưới đây liệt kê toàn bộ các method/path trong OpenAPI. Status hiển thị là
kết quả thực tế; với API có nhiều trường hợp, status được ghi rõ theo từng trường
hợp. `OK` nghĩa là phản hồi phù hợp với ca kiểm thử, không khẳng định hành vi đó an
toàn hoặc đúng chính sách production.

### Ứng dụng, xác thực và tài khoản

| Method và route | Kết quả |
|---|---|
| `GET /` | `200` |
| `GET /health` | `200`; liveness alias, trả `{"status":"ok"}` |
| `POST /auth/sign-up` | `201`; trả access/refresh token |
| `POST /auth/sign-in` | `201` với thông tin hợp lệ; `400` với mật khẩu sai |
| `POST /auth/refresh` | `201`; cấp access token mới |
| `GET /auth/google` | `302` chuyển tới OAuth provider |
| `GET /auth/google/callback` | `302` khi không có phản hồi đăng nhập từ provider; chưa xác minh flow đăng nhập Google end-to-end |
| `POST /users` | `201` không cần token; endpoint tạo user hiện công khai. Kiểm tra DB trong môi trường cô lập xác nhận mật khẩu được lưu plaintext |
| `GET /users` | `401` khi thiếu token; `200` với access token |
| `GET /users/{id}` | `200` không cần token |
| `POST /users/student-cards` | `201` không cần token với file thử |
| `PATCH /users/{id}` | `200` không cần token |
| `DELETE /users/{id}` | `403` với user thường, như guard hiện tại yêu cầu |
| `POST /user-roles` | `500` khi tạo role trùng; lỗi DB bị trả thành Internal Server Error thay vì lỗi conflict |
| `GET /user-roles` | `200` |
| `GET /user-roles/{id}` | `200` |
| `PATCH /user-roles/{id}` | `200` với request cập nhật không làm đổi giá trị |
| `DELETE /user-roles/{id}` | `200 false` với UUID không tồn tại; phản hồi thành công nhưng không xóa được bản ghi |
| `GET /api-docs` | `401` khi không có Basic Auth; chỉ xác minh được cổng bảo vệ, không thử thông tin xác thực hard-code |

### API nghiệp vụ: topics, flash cards, collections

| Method và route | Kết quả |
|---|---|
| `POST /topics` | `201` |
| `GET /topics` | `200` |
| `GET /topics/{id}` | `200` |
| `PATCH /topics/{id}` | `200` |
| `DELETE /topics/{id}` | `200` |
| `POST /flash-cards` | `201` với access token và file thử |
| `GET /flash-cards` | `200` |
| `GET /flash-cards/{id}` | `200` |
| `PATCH /flash-cards/{id}` | `200` không cần token |
| `DELETE /flash-cards/{id}` | `200` không cần token |
| `POST /collections` | `400 Multipart: Unexpected end of form` với multipart có file; lỗi được tái hiện khi gửi request hợp lệ |
| `GET /collections` | `200` |
| `GET /collections/{id}` | `200` với fixture tạo trực tiếp trong DB kiểm thử vì API tạo collection lỗi |
| `PATCH /collections/{id}` | `200` với fixture kiểm thử |
| `DELETE /collections/{id}` | `200` với fixture kiểm thử |

Lỗi `POST /collections` liên quan đến việc gắn `FileInterceptor('image')` hai lần:
controller vừa khai báo `@UseInterceptors(FileInterceptor('image'))`, vừa dùng
`ApiBodyWithSingleFile(...)`, decorator này cũng tự gắn `FileInterceptor`. Các API
GET/PATCH/DELETE collection đã được kiểm tra bằng fixture chỉ tạo trong DB cô lập;
fixture không đại diện cho luồng tạo thành công từ API.

### Queue, media và comments

| Method và route | Kết quả |
|---|---|
| `GET /queues/{name}/status` | `200` cho `email-queue`, `image-queue`, `notification-queue`; `400` với queue name không hợp lệ |
| `GET /queues/{name}/jobs/{jobId}` | `404` cho job không tồn tại, đúng với ca kiểm thử |
| `POST /media/upload` | `400 File is required` khi không gửi file; chưa kiểm tra upload thành công lên S3 |
| `GET /media/{id}` | `404` với media ID không tồn tại |
| `GET /media/{id}/download` | `404` với media ID không tồn tại |
| `DELETE /media/{id}` | `404` với media ID không tồn tại |
| `POST /comments/posts/{postId}` | `201` |
| `POST /comments/{commentId}/replies` | `201` |
| `GET /comments/posts/{postId}/tree` | `200` |
| `GET /comments/{id}/ancestors` | `200` |
| `GET /comments/{id}/descendants` | `200` |
| `PATCH /comments/{id}` | `200` |
| `DELETE /comments/{id}` | `200` khi xóa comment lá; `500` khi xóa comment cha đã có reply. Log ghi `Cannot read properties of null (reading 'id')` trong xử lý descendants |

### Check-in và workflow flash-card

| Method và route | Kết quả |
|---|---|
| `POST /checkin` | `201` |
| `GET /checkin/history` | `200` |
| `GET /checkin/stats` | `200` |
| `GET /checkin/status` | `200` |
| `POST /flash-cards-state` | `201` |
| `GET /flash-cards-state` | `200` |
| `GET /flash-cards-state/{id}` | `200` |
| `PATCH /flash-cards-state/{id}` | `200` ở trạng thái draft |
| `POST /flash-cards-state/{id}/submit` | `201` |
| `POST /flash-cards-state/{id}/approve` | `403` với user thường, đúng với trường hợp bị từ chối; cũng `403` sau khi nâng test user thành Admin trong DB cô lập |
| `POST /flash-cards-state/{id}/reject` | `201` |
| `POST /flash-cards-state/{id}/publish` | `400` khi publish draft, đúng với transition không hợp lệ |
| `GET /flash-cards-state/{id}/transitions` | `200` |
| `GET /flash-cards-state/{id}/allowed-transitions` | `200` |

Admin không approve được vì workflow kiểm tra role dạng chữ thường (`admin`,
`team_leader`), trong khi enum role của ứng dụng lưu `Admin`/`User`. Đây là lỗi
được tái hiện với user đã đổi sang Admin trong DB kiểm thử.

## Vấn đề ưu tiên cải thiện

### P0 — Không dùng trong production trước khi khắc phục

1. **Bảo vệ endpoint user và dữ liệu cá nhân:** `POST /users`, `GET /users/{id}`,
   `PATCH /users/{id}` và `POST /users/student-cards` hiện không yêu cầu đăng nhập.
   `POST /users` đã được xác minh lưu mật khẩu dạng plaintext. Hash mật khẩu tập trung
   cho mọi đường tạo user và áp dụng authentication/ownership/authorization nhất quán.
2. **Bảo vệ dữ liệu Flash Card và cấu hình endpoint:** `PATCH/DELETE
   /flash-cards/{id}` không yêu cầu token; cần xác minh ownership cho cả đọc/sửa/xóa,
   cũng như quyền CRUD `topics`, `collections`, `user-roles`.
3. **Sửa các lỗi chức năng tái hiện được:** chỉ gắn một Multer interceptor cho
   `POST /collections`; sửa `DELETE /comments/{id}` để xóa cây comment không lỗi;
   đồng bộ casing role trong flash-card workflow với enum thực tế.
4. **Xử lý lỗi dữ liệu nhất quán:** duplicate role không được trả `500`; xóa ID không
   tồn tại không nên trả `200 false`. Trả status/message theo hợp đồng API rõ ràng.
5. **Xác thực và secrets:** access-token expiration, key management, Swagger credentials
   và Google OAuth callback vẫn cần khắc phục như nêu trong
   `docs/PRODUCTION_READINESS_PLAN.md`. Callback được gọi ở đây nhưng không có
   credentials/authorization response thật để xác nhận đăng nhập hoạt động.

### P1 — Vận hành và độ tin cậy

- Chạy được migration trên production runtime: tài liệu gọi `migration:run` trong
  image production nhưng lệnh đang phụ thuộc `ts-node` (dev dependency).
- Không publish PostgreSQL/Redis ra host trong cấu hình triển khai; thêm healthcheck
  cho Redis và chờ Redis healthy trước khi start API.
- Loại bỏ `version` đã lỗi thời khỏi Compose; cấu hình container name/port tránh xung
  đột giữa các checkout. Compose hiện phát cảnh báo `version` obsolete.
- Chuyển Dockerfile từ `npm install` sang cài dependency tái lập theo lockfile; chạy
  container non-root và kiểm tra image không chứa `.env`/private key.
- Đã căn chỉnh Node runtime/CI theo NestJS 12 và toolchain hiện tại: Dockerfile và
  GitLab pipeline dùng Node 24; `package.json` yêu cầu Node >=24.15.
- Hoàn thiện upload file: giới hạn kích thước/số file ở Multer, xác minh loại file,
  và bảo vệ toàn bộ metadata/download/delete theo quyền sở hữu. Test hiện không có
  AWS credentials thật nên không thể xác nhận S3 upload/download/delete end-to-end.

### P2 — Hoàn thiện khả năng dùng chung và giám sát

- Email và notification processors hiện là mock; tích hợp provider thật, retry,
  idempotency và xử lý job lỗi trước khi bật trên dự án.
- Queue controller chỉ có endpoint đọc thống kê/trạng thái job; các thao tác enqueue
  hiện có ở service nhưng không được expose qua API. Cần xác định đây là chủ đích hay
  cần API nội bộ được bảo vệ.
- Readiness hiện được kiểm tra riêng tại `/health/ready` cho DB/Redis; structured
  logs/correlation ID, metrics và cảnh báo cần được theo dõi độc lập.
- Tách flash-card, check-in, comments và các tích hợp tùy chọn khỏi core starter để
  dự án mới chỉ cấu hình/bật các module mình dùng.

## Giới hạn và cách tái hiện

- Dùng credentials giả cho AWS/Google. Không thực hiện xác thực Google với provider,
  không tải file lên S3 và không gửi email/notification thật. Các route liên quan
  được gọi ở mức có thể kiểm tra không cần dịch vụ ngoài, nhưng không được tính là
  end-to-end pass.
- Queue API chỉ kiểm tra status và truy vấn một job không tồn tại; không có API
  enqueue HTTP để kiểm tra từ bên ngoài.
- Không chạy Jest/e2e suite trong lần kiểm thử Docker/API này; tập trung vào build,
  migration và request thực tế đến 60 operation OpenAPI.
- Test stack dùng DB/Redis volume cô lập; không dùng hoặc sửa volume của project
  `project_base_nestjs`. Không dùng dữ liệu thật.
- API được chạy tại `http://localhost:3317` trong thời gian kiểm thử. Stack kiểm thử
  được tạo tách biệt khỏi checkout chính; kiểm tra/stop stack chỉ bằng project
  `bp_validation`, không stop container cùng tên thuộc project khác.
- Lệnh triển khai đã dùng:
  `docker compose -p bp_validation --env-file .env.dev -f docker-compose.dev.yml -f docker-compose.validation.override.yml up -d --build`.
  `.env.dev` chứa credentials giả chỉ dùng cho local; file cấu hình tạm và các
  container/volume riêng của lần kiểm thử đã được dọn sau khi chạy xong.

## Kết luận

Đoạn kết luận này ghi nhận trạng thái baseline trước hardening, không mô tả trạng thái
source hiện tại. Các lỗi chức năng và bảo mật nêu ở baseline đã được xử lý trong các
thay đổi sau đó; kết quả kiểm thử hiện hành nằm ở mục “Re-kiểm tra sau hardening”.
Các tích hợp provider thật vẫn cần được cấu hình và nghiệm thu riêng trong từng dự án.

## Kiểm tra lại sau khi gia cố

Đây là lần xác minh sau các thay đổi production-readiness; không chạy lại toàn bộ
60 API operation trong lần này.

| Hạng mục | Kết quả |
|---|---|
| `npm run build` | Thành công trên source hiện tại với NestJS 12.1.2, TypeScript 6 và Node 24 |
| Production Docker image build | Pass sau khi nâng NestJS 12: `docker build --target production -t copilot-nest12-upgrade-check .`; production dependencies audit có 0 vulnerabilities |
| Production container / Compose smoke test | Pass sau khi nâng NestJS 12 trên PostgreSQL/Redis cô lập: migration job thoát `0`; API, PostgreSQL và Redis healthy; `/`, `/health/live`, `/health/ready` trả HTTP 200, readiness trả `ready`; Google OAuth/S3 tắt |
| Dọn tài nguyên kiểm thử | Thành công; stack/container, network, volumes và file env giả riêng của smoke test đã được xóa |
| Focused security tests | 5 suites, 30/30 tests pass; gồm OAuth state store/guard, password hashing/serialization, repository và welcome endpoint |
| Full Jest | Pass: 51/51 suites, 182/182 tests; gồm HTTP auth throttling, per-endpoint success message catalog, NestJS/custom/validation error envelopes và custom error catalog, token expiration config, legacy-data security migration, ownership, JWT signature/expiration, upload validation và queue mock safeguards |
| Full e2e | Pass: 6/6 suites trên Node 24, PostgreSQL 16 và Redis cô lập; các route health/root và authentication guard trả đúng HTTP status/envelope |
| Full repository lint | Pass: 0 errors |
| `npm audit` / `npm audit --omit=dev` | 0 vulnerabilities sau khi nâng đồng bộ NestJS, Jest và TypeScript ESLint |
| Legacy-data migration | Pass trên PostgreSQL 16 cô lập: user được giữ lại, password hash hóa, refresh token cũ bị revoke và enum role được cập nhật |
| Google OAuth, S3, staging, backup/restore và load test | Chưa xác minh; cần provider credentials và hạ tầng/môi trường phù hợp |

Compose smoke test trước đó kiểm tra migration trên PostgreSQL sạch và health/readiness;
migration dữ liệu nâng cấp đã được xác minh riêng trên PostgreSQL 16 như ghi ở bảng.
Tại thời điểm ghi nhận phần hardening, Dev API matrix ban đầu chưa được chạy lại;
kết quả kiểm thử mới nhất sau hardening được ghi ở cuối tài liệu. Những việc còn
lại thuộc application scope được theo dõi trong
`docs/PRODUCTION_READINESS_PLAN.md`; staging, backup/restore và triển khai
production không phải điều kiện để đánh giá chất lượng source base.

### Kiểm thử cuối trên ngăn xếp cô lập — 2026-10-08

Stack `api_validation` dùng PostgreSQL/Redis dữ liệu giả, API tại
`http://localhost:3317`, PostgreSQL host port `3533`. API chạy từ bản build trong
Node 24; không dùng tài nguyên production. Các lỗi được phát hiện trong lần kiểm
thử cuối đã được sửa và chạy lại:

| Hạng mục | Kết quả |
|---|---|
| `npm run build` | Pass trên source sau các sửa lỗi cuối |
| `npm run lint` | Pass |
| Full Jest | Pass: 58/58 suites, 202/202 tests |
| Postman collection sinh từ OpenAPI | Pass; 68 operations, tất cả 68 test scripts chạy không lỗi |
| Ma trận Postman 68 API | 30×200, 10×201, 3×400, 18×404, 5×409, 2×503; không có lỗi request hoặc 5xx ngoài Google OAuth tắt |
| Collection `is_public` | Pass với multipart `"true"` và `"false"`; PATCH JSON đổi ngược từng giá trị thành công |
| Readiness | `/health/ready` trả `200` |

Các `503` là `/auth/google` và callback khi OAuth bị tắt. `404` gồm feature flags
tắt, ID mẫu không tồn tại và job không tồn tại; `409` gồm dữ liệu thử đã có sẵn
hoặc check-in lặp trong ngày. `400` gồm upload không có file và transition
flash-card không hợp lệ. Đây là các phản hồi theo dữ liệu/cấu hình ca thử, không
phải lỗi server. Tài khoản Admin chỉ được gán trong DB validation cô lập.

Khắc phục trong lượt này: cô lập scope script Postman để token/ID được lưu qua các
request, đưa nhóm Auth lên đầu collection và đồng bộ biến giữa environment với
collection; thêm `Origin` hợp lệ cho request thay đổi dữ liệu để không xung đột
với cookie auth; xử lý `date` PostgreSQL trả về dạng chuỗi trong logic streak
check-in; chuẩn hóa trường ảnh multipart rỗng thành chưa cung cấp. Collection tạo
được khi không có ảnh; Flash Card vẫn yêu cầu file hoặc URL, nên collection mẫu
không gắn file trả `400` có chủ đích. Postman reply body dùng cùng `post_id` với
route. File upload S3, Google OAuth, email flows và provider thật vẫn chưa được
nghiệm thu end-to-end.
