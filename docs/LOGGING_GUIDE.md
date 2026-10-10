# Hướng dẫn ghi log (Pino)

Dự án sử dụng `nestjs-pino` (dựa trên `pino`) làm logger chính. Pino là logger có hiệu năng cực cao và log dưới dạng JSON structured, giúp dễ dàng tích hợp với các hệ thống phân tích log như Datadog, ELK, Grafana Loki, CloudWatch.

## 1. Cấu hình cơ bản

- **Development**: Log sẽ được pretty-print (màu sắc, dễ đọc).
- **Production**: Log sẽ output định dạng raw JSON.
- **Log level**: Lấy từ biến môi trường `LOG_LEVEL` (mặc định `info` ở production, `debug` ở development).
- **Auto-logging**: `nestjs-pino` log mỗi HTTP request một lần; request ID do server tạo được gắn ở field `requestId` và trả về qua response header `x-request-id`. Access log chỉ ghi route path, không ghi query string. Các endpoint health được bỏ qua để giảm noise.
- **Redaction**: Các trường nhạy cảm như password, token, header authorization sẽ tự động bị ẩn khỏi log (thay bằng `[Redacted]`).

## 2. Cách inject và sử dụng logger trong mã nguồn

Logger Pino được kết nối làm NestJS logger toàn cục trong `main.ts`. Có thể tiếp tục dùng `Logger` của `@nestjs/common`; log từ controller/service sẽ đi qua Pino và tự mang request context. Có thể inject `PinoLogger` khi cần truyền object fields theo format Pino.

### Ví dụ service

```typescript
import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class AuthService {
	// 1. Inject Logger vào constructor
	constructor(private readonly logger: PinoLogger) {}

	async signIn(userId: string) {
		// 2. Log dạng structured (Truyền object context làm tham số đầu, string message làm tham số hai)
		this.logger.info(
			{ userId, action: 'sign_in_attempt' },
			'User attempting to sign in',
		);

		try {
			// ... logic
			this.logger.info({ userId }, 'User signed in successfully');
		} catch (error) {
			// 3. Truyền biến error vào log kèm các thông tin khác
			this.logger.error({ err: error, userId }, 'User sign in failed');
			throw error;
		}
	}
}
```

### Các mức độ log

- `this.logger.trace()` - Chi tiết rất nhỏ để debug flow (hiếm dùng).
- `this.logger.debug()` - Thông tin để debug trong lúc phát triển.
- `this.logger.info()` - Thông tin luồng hoạt động chính (được bật ở production).
- `this.logger.warn()` - Có thể xảy ra lỗi/bất thường nhưng luồng chính vẫn tiếp tục.
- `this.logger.error()` - Lỗi thực sự, request thất bại, cần có người xem xét (có kèm stack trace).
- `this.logger.fatal()` - Lỗi nghiêm trọng khiến app bị crash.

## 3. Thực hành tốt nhất

1. **Luôn truyền object context trước** với `PinoLogger`: `this.logger.info({ key: 'value' }, 'Message')`.
2. **Ngắn gọn phần message**: Message chỉ là chuỗi ngắn để đọc lướt, dữ liệu cần search (userId, action, reason) thì để ở object.
3. **Traceability**: Nếu bạn viết custom filter, middleware, đảm bảo log ra `req.id` để có thể truy ngược lại tất cả các thao tác sinh ra từ cùng một HTTP request.
4. **Không log dữ liệu nhạy cảm bằng tay**: Dù Pino đã có redaction (ẩn nội dung), nhưng bạn không nên truyền cả cụm data nhạy cảm vào log.

## 4. Vận hành và tra cứu

Ba lớp audit dùng ba nguồn phù hợp để không ghi toàn bộ access traffic vào PostgreSQL:

- Request/API access: Pino JSON trên stdout, có request ID, method, route, status,
  thời gian phản hồi, IP và user ID nếu đã xác thực.
- Application/security events: bảng PostgreSQL `audit_events`; hiện có sự kiện
  authentication/account lifecycle và thay đổi user/role. Mỗi bản ghi cũng được ghi
  thành structured Pino event để tra cứu tập trung.
- Database: pgAudit ghi các thao tác `WRITE`, `DDL`, `ROLE` vào PostgreSQL container
  log; tham số SQL bị tắt để hạn chế lộ dữ liệu.

Xem các log trên Grafana theo [Audit Guide](AUDIT_GUIDE.md).

## 5. Vận hành log trong production (ghi log tập trung)

### 5.1. Nguyên tắc

- **Container KHÔNG ghi log vào file** bên trong container. Pino ghi ra `stdout` dạng JSON – đây là cách chuẩn cho Docker/K8s.
- Một agent/sidecar bên ngoài sẽ thu thập `stdout` và đẩy lên hệ thống tập trung.

### 5.2. Các hệ thống ghi log tập trung phổ biến

| Hệ thống           | Agent thu thập                              | Ghi chú                   |
| ------------------ | ------------------------------------------- | ------------------------- |
| **AWS CloudWatch** | CloudWatch Agent hoặc FireLens (Fluent Bit) | Tích hợp sẵn trên ECS/EKS |
| **Datadog**        | Datadog Agent                               | Tự động parse JSON log    |
| **Grafana Loki**   | Grafana Alloy / Fluent Bit                  | Nhẹ, chi phí thấp         |
| **ELK Stack**      | Filebeat / Logstash                         | Mạnh mẽ, phức tạp hơn     |

### 5.3. Cách truy vết một request trong production

1. Lấy `x-request-id` từ response header (server tạo mới cho từng request).
2. Trên hệ thống log tập trung, search theo field `requestId` bằng giá trị request-id đó.
3. Tất cả log entries liên quan đến request đó sẽ xuất hiện (HTTP request log, business logic log, exception log).

### 5.4. Cấu hình Fluent Bit (ví dụ cho ECS/K8s)

```ini
[INPUT]
    Name              tail
    Path              /var/log/containers/*.log
    Parser            docker
    Tag               app.*

[FILTER]
    Name              parser
    Match             app.*
    Key_Name          log
    Parser            json

[OUTPUT]
    Name              cloudwatch_logs
    Match             app.*
    region            ap-southeast-1
    log_group_name    /ecs/nestjs-app
    log_stream_prefix from-fluent-bit-
    auto_create_group true
```

### 5.5. Lưu ý

- **Development** sử dụng `pino-pretty` (pretty log có màu) cho trải nghiệm developer tốt. Staging dùng JSON giống production.
- **Production** bắt buộc dùng JSON log, không bật `pino-pretty` (ảnh hưởng hiệu năng và phá vỡ JSON parsing của agent).
