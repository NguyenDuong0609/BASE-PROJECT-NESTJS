# Hướng dẫn tính năng mới và hệ thống giám sát

Tài liệu này mô tả các tính năng có trong mã nguồn và các lựa chọn bảng điều khiển.
Để xem hướng dẫn giúp module mới tự động tích hợp với phản hồi API, log, metrics,
tracing và Docker health, hãy tham khảo
[Hướng dẫn tích hợp module](MODULE_INTEGRATION_GUIDE.md).

---

## 1. Các tính năng mới (Vừa được thêm vào)

### 1.1. Quốc tế hóa (I18n)

- **Công nghệ**: `nestjs-i18n`
- **Hoạt động**: Hỗ trợ đa ngôn ngữ (hiện có `en` và `vi`). Thư mục chứa các tệp bản dịch nằm ở `src/i18n/`.
- **Cách dùng**:
  - Gửi header `Accept-Language: vi` hoặc `x-lang: vi`.
  - Hoặc truyền tham số truy vấn `?lang=vi`.
  - Nếu không truyền, mặc định sẽ dùng `en`.

### 1.2. Xác thực 2 yếu tố (2FA / OTP)

- **Công nghệ**: `otplib` (TOTP v4) và `qrcode`.
- **Hoạt động**:
  - `POST /api/v1/auth/2fa/generate`: Tạo mã bí mật (Secret) và trả về luồng ảnh QR Code. Người dùng quét bằng Google Authenticator hoặc Authy.
  - `POST /api/v1/auth/2fa/turn-on`: Gửi mã gồm 6 chữ số từ app để kích hoạt 2FA.
  - `POST /api/v1/auth/2fa/authenticate`: Sau khi đăng nhập bằng mật khẩu, nếu 2FA được bật, gọi endpoint này kèm mã 6 số để nhận Token JWT.
  - `POST /api/v1/auth/2fa/turn-off`: Tắt 2FA.
- **Lưu ý**: Các route trên yêu cầu truyền Access Token ở header (`Bearer`).

### 1.3. Hỗ trợ nhiều tenant cơ bản

- **Hoạt động**: Middleware `TenantMiddleware` trích xuất header `X-Tenant-Id` từ mọi request và gán giá trị vào `req.tenantId`.
- **Database**: `BaseEntity` (mà mọi entity khác kế thừa) đã có sẵn cột `tenant_id`.
- **Cách dùng**: Ở tầng Repository/Service, khi truy vấn hoặc thêm dữ liệu, bạn có thể tự động đưa `req.tenantId` vào điều kiện truy vấn để bảo đảm cô lập dữ liệu.

### 1.4. Đánh phiên bản API

- **Hoạt động**: Dự án đã bật Global Prefix là `api` và URI Versioning mặc định là `1`.
- **Kết quả**: Mọi route tự động trở thành `/api/v1/...` (ví dụ: `/api/v1/auth/sign-in`).

---

## 2. Hệ thống giám sát và ghi log (bảng điều khiển)

Bạn thắc mắc: _"Làm sao xem giao diện bảng điều khiển cho logging, Sentry, OpenTelemetry, Prometheus? Có cần thiết lập Docker không?"_

### 2.1. Logging (nestjs-pino)

- **Hiện tại**: `nestjs-pino` ghi request log; log production là JSON, log
  development được pretty-print. Request ID được tạo và trả qua `x-request-id`.
  Đây là logging/correlation, không phải distributed tracing. Xem
  [Logging Guide](LOGGING_GUIDE.md) để cấu hình và sử dụng.
- **Giao diện bảng điều khiển**: Có cấu hình tùy chọn **Grafana + Loki + Grafana Alloy** trong
  `docker-compose.audit.yml`; bảng điều khiển dựng sẵn hiển thị request access, application
  events và pgAudit. Cách chạy: [Hướng dẫn audit](AUDIT_GUIDE.md).
- **Có cần Docker không?**: Có nếu tự lưu trữ; các dịch vụ bảng điều khiển không nằm trong
  stack mặc định và chỉ chạy khi bật profile `audit-ui`.

### 2.2. Sentry (theo dõi lỗi)

- **Hiện tại**: Trong file `.env.example` có sẵn biến `SENTRY_DSN`. Mã nguồn nền đã sẵn sàng để tích hợp (bạn có thể cài `@sentry/node`).
- **Giao diện bảng điều khiển**: Sentry có giao diện web mạnh mẽ (https://sentry.io).
- **Có cần Docker không?**:
  - **KHÔNG**. Sentry thường được dùng dưới dạng SaaS. Bạn chỉ cần tạo tài khoản trên sentry.io, lấy mã DSN dán vào `.env` để log lỗi tự động được gửi lên bảng điều khiển của họ.
  - (Sentry có bản self-hosted bằng Docker, nhưng cực kỳ nặng và tốn RAM, không khuyến nghị chạy chung ở máy dev cục bộ).

### 2.3. Prometheus và Grafana (metrics)

- **Hiện tại**: Base có HTTP request counter và duration histogram qua
  `GET /metrics` khi `ENABLE_METRICS=true`. Endpoint xuất Prometheus text; chưa có
  dashboard Grafana đi kèm và chưa có custom business metrics tổng quát. Docker
  Compose production hiện bật metrics phải được cấu hình chủ động trong môi
  trường và cần cấu hình Prometheus scraper/dashboard riêng.
- **Giao diện bảng điều khiển**: Grafana.
- **Có cần Docker không?**:
  - **CÓ**. Để xem biểu đồ, bạn cần chạy 2 container trong `docker-compose.yml`:
    1. **Prometheus**: Định kỳ 10 giây thu thập dữ liệu từ `/metrics`.
    2. **Grafana**: Kết nối với Prometheus để hiển thị biểu đồ trực quan (CPU, RAM, số lượng request).

### 2.4. OpenTelemetry (tracing)

- **Hiện tại**: Chưa tích hợp OpenTelemetry SDK/exporter hay distributed tracing.
  `requestId` chỉ dùng để ghép log cùng request, không tạo trace/span hoặc tự đo
  luồng qua database/HTTP client.
- **Giao diện bảng điều khiển**: **Jaeger** hoặc **Zipkin**.
- **Có cần Docker không?**:
  - **CÓ**. Nếu muốn xem trên máy development, bạn cần bật một container Jaeger (thường là `jaegertracing/all-in-one`) trong `docker-compose.yml`, sau đó truy cập cổng `16686` để mở giao diện.

---

## 3. Tổng kết về Docker cho hệ thống giám sát

Nếu muốn chạy **đầy đủ giao diện bảng điều khiển** ngay trên máy cục bộ, bạn cần bổ sung các service sau vào `docker-compose.yml`:

1. `prometheus` (Thu thập metrics)
2. `grafana` (Bảng điều khiển hiển thị biểu đồ metrics)
3. `jaeger` (Bảng điều khiển xem trace OpenTelemetry, hiện chưa tích hợp)
4. `loki` + `alloy` + `grafana` (Thu thập và xem audit/log; cấu hình đã có)

**Khuyến nghị thực tế:**

- **Trên máy development**: Không nên chạy tất cả công cụ này vì rất tốn RAM (khoảng 4-6GB RAM chỉ cho các công cụ này). Trong development, chỉ cần log `pino-pretty` (in màu ra terminal) là đủ.
- **Trong production**: Các công ty thường dùng dịch vụ SaaS trên cloud (Datadog, Sentry, NewRelic, AWS CloudWatch) để không phải tự vận hành bằng Docker, hoặc dùng một cụm máy chủ giám sát riêng, tách biệt với máy chủ chạy ứng dụng.
