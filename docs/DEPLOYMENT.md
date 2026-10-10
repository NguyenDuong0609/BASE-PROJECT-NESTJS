# Hướng dẫn triển khai

Kho mã này cung cấp mẫu triển khai bằng Docker Compose, không phải dịch vụ triển khai
đám mây được quản lý. Mỗi dự án cần tự cấu hình secrets được bảo vệ, TLS/proxy ngược,
nơi lưu bản sao lưu, giám sát và quy trình phát hành/khôi phục đã được kiểm thử.

## Phát triển cục bộ

1. Sao chép `.env.example` thành `.env.dev`; chỉ dùng thông tin xác thực cục bộ và thay
   cả hai giá trị JWT bằng chuỗi ngẫu nhiên dài ít nhất 32 ký tự.
2. Đặt `LOG_FORMAT=json`, `ENABLE_METRICS=true` và mật khẩu Grafana mạnh trong
   `.env.dev` (tham khảo `.env.example`).
3. Build và khởi chạy toàn bộ stack, gồm Grafana/Loki/Alloy/Prometheus:

   ```powershell
   docker compose --env-file .env.dev --profile audit-ui `
     -f docker-compose.dev.yml -f docker-compose.audit.yml up -d --build
   ```

   Đây là lệnh khởi động khuyến nghị; chỉ chạy `npm run docker:dev` sẽ không bật
   profile observability. Xem dashboard tại `http://localhost:3001`. Hướng dẫn đầy đủ:
   [Grafana Guide](GRAFANA_GUIDE.md).

API được mở trên loopback tại cổng `PORT` (mặc định `3000`). PostgreSQL khả dụng qua
cổng loopback `5433`; Redis chỉ truy cập được trong mạng Compose.

## Domain mẫu tùy chọn

Hạ tầng xác thực, người dùng/vai trò, phản hồi API, cơ sở dữ liệu, health check và khả
năng quan sát là phần nền có thể tái sử dụng. Flash Cards và các ví dụ nghiệp vụ vẫn có
trong kho mã nhưng route của chúng mặc định bị tắt. Đặt cờ tương ứng thành `true` để
mở các route của module:

```dotenv
ENABLE_FLASH_CARDS=true
ENABLE_COLLECTIONS=true
ENABLE_TOPICS=true
ENABLE_CHECKIN=true
ENABLE_COMMENTS=true
ENABLE_FLASH_CARD_STATES=true
ENABLE_STUDENT_CARD_UPLOADS=false
```

Tắt quyền truy cập route không xóa các bảng hoặc dữ liệu hiện có. Chỉ xóa module không
dùng và migration của chúng khi tạo dự án mới hoặc sau khi đã rà soát việc chuyển đổi dữ
liệu. Tải thẻ sinh viên là endpoint ví dụ chưa hoàn chỉnh và mặc định bị tắt. Không bật
`ENABLE_STUDENT_CARD_UPLOADS` cho đến khi dự án triển khai quy tắc lưu trữ và xác minh;
stub hiện tại sẽ trả về `501` nếu được bật.

Mã khách hàng Stripe cũ cho phép giá trị null, không còn được gán giá trị giả
`cus_mock_id`, và các giá trị giữ chỗ hiện có sẽ được migration xóa. Trường này vẫn nằm
trong schema để tương thích khi nâng cấp; tích hợp thanh toán mới nên quản lý schema và
vòng đời của nhà cung cấp trong một module riêng.

## Số liệu metrics

Đặt `ENABLE_METRICS=true` để cung cấp metrics dạng văn bản của Prometheus tại
`GET /metrics`. Metrics chỉ thuộc tiến trình hiện tại và được đặt lại khi khởi động lại;
cần thu thập riêng từng bản sao ứng dụng. Endpoint không có xác thực ở cấp ứng dụng, vì
vậy chỉ mở trên mạng riêng hoặc giới hạn tại proxy ngược/đầu thu thập. Endpoint ghi nhận
mẫu route có số lượng hữu hạn thay vì request ID, chuỗi truy vấn hoặc giá trị đường dẫn
do người dùng cung cấp. Endpoint cũng xuất kết quả cache ứng dụng và số lượng tác vụ
trong queue; việc thu thập số lượng queue sẽ truy vấn Redis một lần cho mỗi queue, nên
cần đặt chu kỳ thu thập phù hợp. Mẫu Compose production chuyển tiếp cấu hình metrics,
cờ domain và SMTP/luồng tài khoản từ `.env.prod` vào container API.

## Optional account email flows

Xác minh email và đặt lại mật khẩu mặc định bị tắt, không phụ thuộc vào Google hay AWS.
Bật bằng `ENABLE_ACCOUNT_EMAIL_FLOWS=true` và cấu hình máy chủ chuyển tiếp SMTP thông
thường (`SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM_EMAIL`; máy chủ cục bộ có thể không cần xác
thực). Đặt `REQUIRE_VERIFIED_EMAIL=true` để từ chối đăng nhập và sử dụng access token cho
đến khi người dùng xác minh địa chỉ email. Liên kết đặt lại mật khẩu hết hạn sau 30 phút;
liên kết xác minh hết hạn sau 24 giờ. Hệ thống chỉ lưu mã băm của token và mỗi token chỉ
dùng được một lần. Ứng dụng không trả token đặt lại mật khẩu trong phản hồi API.

## Mẫu Compose production

Tạo `.env.prod` được bảo vệ bên ngoài hệ thống quản lý phiên bản. Đặt `APP_VERSION` bất
biến, thông tin xác thực DB, mật khẩu Redis (ít nhất 16 ký tự base64url), hai JWT secret
ngẫu nhiên độc lập (mỗi secret ít nhất 32 ký tự) và `FRONTEND_URL` dùng HTTPS. Chỉ bật
S3 hoặc Google OAuth sau khi cung cấp cấu hình dịch vụ tương ứng. Giữ Swagger ở trạng
thái tắt trừ khi đã cấu hình rõ username và mật khẩu dài ít nhất 16 ký tự.

```sh
docker compose --env-file .env.prod --profile audit-ui \
  -f docker-compose.prod.yml -f docker-compose.audit.yml config --quiet
docker compose --env-file .env.prod --profile audit-ui \
  -f docker-compose.prod.yml -f docker-compose.audit.yml build
docker compose --env-file .env.prod --profile audit-ui \
  -f docker-compose.prod.yml -f docker-compose.audit.yml up -d --build
```

Các lệnh trên bật cả stack quan sát (Grafana, Loki, Alloy, Prometheus) cùng API,
migration, PostgreSQL và Redis. Đặt `ENABLE_METRICS=true` và
`GRAFANA_ADMIN_PASSWORD` trong `.env.prod`. Xem [Grafana Guide](GRAFANA_GUIDE.md)
để biết dashboard, truy vấn log và cách truy cập an toàn.

Compose chạy các migration TypeORM đã biên dịch bằng một tác vụ phát hành duy nhất trước
khi khởi động API. PostgreSQL và Redis không được mở cổng ra máy chủ. API chỉ bind vào
loopback; hãy đặt proxy ngược/bộ cân bằng tải kết thúc TLS phía trước. Không dùng tag
`latest` có thể thay đổi làm mã định danh bản phát hành.

## Health checks and operations

- `GET /health/live` reports process liveness.
- `GET /health/ready` checks PostgreSQL and Redis; it returns `503` if either dependency
  is unavailable. Compose uses this readiness endpoint.
- `GET /health` is retained as a liveness alias for compatibility.
- Both development and production Compose configurations include an API container
  healthcheck that polls `/health/ready`; PostgreSQL and Redis have their own checks.
  Inspect the resulting `healthy`/`unhealthy` state with `docker compose ps`. A failed
  healthcheck does not by itself restart a container under Compose.
- See [Module Integration Guide](MODULE_INTEGRATION_GUIDE.md) for probe behavior,
  request logging, API response/metrics integration, and the current tracing boundary.
- `docs/OPERATIONS_BACKUP_RESTORE.md` documents a provider-neutral PostgreSQL backup
  and restore procedure. Choose and rehearse the schedule, encryption, retention, and
  recovery objectives for each deployment.
- Keep database backups encrypted and off-host. The schedule, retention, RPO/RTO, restore
  exercise, alerting, and rollback strategy must be selected and tested by each deployment
  owner; this repository cannot verify those external operations.

## Triển khai GitLab CI qua SSH

Các job staging (`develop`) và production (`main`) chạy thủ công sẽ triển khai image
bất biến `$CI_COMMIT_SHA` lên máy chủ Docker Compose qua SSH. Máy đích cần chạy Docker
Engine và plugin Docker Compose v2 đủ mới để hỗ trợ `up --wait`. Thư mục triển khai phải
có sẵn tệp `.env.prod` được bảo vệ; CI không tải lên hoặc in ra các secret triển khai.

Đặt cả hai nhánh đích ở trạng thái protected và đánh dấu môi trường triển khai GitLab
`staging`, `production` là protected. Thêm các biến CI/CD sau và giới hạn chúng trong
môi trường tương ứng:

| Biến                     | Loại            | Mục đích                                                              |
| ------------------------ | --------------- | --------------------------------------------------------------------- |
| `DEPLOY_HOST`            | Biến            | Tên DNS hoặc địa chỉ IPv4 của máy đích                                |
| `DEPLOY_USER`            | Biến            | Tài khoản SSH được phép quản lý bản triển khai                        |
| `DEPLOY_PATH`            | Biến            | Đường dẫn tuyệt đối chứa `.env.prod` và trạng thái Compose             |
| `DEPLOY_SSH_PRIVATE_KEY` | Tệp, protected  | Khóa riêng của tài khoản triển khai                                   |
| `DEPLOY_SSH_KNOWN_HOSTS` | Tệp, protected  | Host key đã xác minh; không tạo độ tin cậy bằng `ssh-keyscan` trong CI |

Tài khoản triển khai cần quyền chạy Docker Compose trong `DEPLOY_PATH`. Tạo sẵn tệp
`.env.prod` trên máy chủ với quyền truy cập hạn chế (`0600`) và cấu hình kho thông tin
xác thực Docker trên máy chủ bằng GitLab deploy token chỉ có quyền `read_registry`.
Không cấp cho tài khoản triển khai quyền cao hơn mức cần thiết.

Pipeline sao chép các tệp Compose production và audit tùy chọn, entrypoint Redis cùng
cấu hình Grafana/Loki/Alloy; sau đó tải image API và cơ sở dữ liệu pgAudit gắn với commit,
chạy dịch vụ migration và chờ các dịch vụ Compose ở trạng thái khỏe mạnh. Bước phê duyệt
thủ công và khóa `resource_group` theo từng môi trường ngăn phát hành tự động cũng như
triển khai đồng thời vào cùng môi trường. Nếu chờ health check thất bại, job sẽ thất bại;
hãy kiểm tra log Compose trên máy chủ trước khi thử lại.

Job GitLab CI hiện triển khai bằng `docker-compose.prod.yml` đơn lẻ nên không bật
profile observability tự động. Muốn CI deploy xong có Grafana, cần cập nhật job để
dùng thêm `docker-compose.audit.yml` và `--profile audit-ui`, hoặc chạy lệnh production
trong [Grafana Guide](GRAFANA_GUIDE.md) trên host sau deploy. Grafana bind vào loopback
của máy chủ (`127.0.0.1:3001`); hãy dùng SSH tunnel hoặc proxy ngược TLS có xác thực
thay vì mở cổng này ra Internet.

Để khôi phục phiên bản, triển khai lại image tag bất biến trước đó với cùng đường dẫn
registry:

```sh
APP_IMAGE=registry.example/group/project APP_VERSION=<previous-commit-sha> \
  POSTGRES_IMAGE=registry.example/group/project/postgres POSTGRES_VERSION=<previous-commit-sha> \
  docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --remove-orphans
```

Chờ health check của API thành công trước khi xem việc khôi phục là hoàn tất. Chỉ khôi
phục image ứng dụng khi các migration cơ sở dữ liệu đã chạy có khả năng tương thích ngược;
nếu không, hãy phát hành bản sửa tiến hoặc dùng quy trình khôi phục cơ sở dữ liệu riêng đã
được rà soát.

## Công việc còn lại theo từng nhà cung cấp

Pipeline yêu cầu build, unit/e2e test, lint, kiểm tra dependency và đóng gói image
production hoàn tất trước các job triển khai thủ công. Đích SSH chung này chỉ là mẫu:
cấu hình máy chủ thực tế dưới dạng protected variables và diễn tập triển khai/khôi phục
trên staging trước khi dùng production. Cấu hình quét image và chạy smoke test ở cấp ứng
dụng trên staging trước khi phát hành; build thành công không đồng nghĩa hệ thống đã sẵn
sàng cho production.

Các queue processor dành cho email chung, xử lý ảnh và thông báo người dùng vẫn cần hợp
đồng gửi riêng cho ứng dụng và nhà cung cấp thực tế. Email cho thao tác tài khoản đã dùng
SMTP, nhưng email qua queue chưa có danh mục template cho nội dung/tệp đính kèm; tác vụ
xử lý ảnh cần quy ước lưu trữ nguồn/đầu ra; thông báo cần nhà cung cấp gửi và mô hình
người nhận/thiết bị. Các processor này chủ động từ chối chạy mock trong production thay
vì báo thành công giả. Hãy xác định các hợp đồng đó trước khi bật queue production.

Tracing phân tán và metrics về connection pool/truy vấn cơ sở dữ liệu cũng chưa được cấu
hình. Hãy chọn backend/bộ thu thập tracing, chính sách lưu giữ và mô hình triển khai trước
khi bổ sung OpenTelemetry exporter hoặc công khai thuộc tính truy vấn nhạy cảm.
