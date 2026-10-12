# Logging

Tài liệu về hệ thống ghi log có cấu trúc sử dụng Pino, vận chuyển qua Grafana Alloy và phân tích trên Grafana Loki.

---

## 1. Tổng quan Kiến trúc Logging

```
┌─────────────────┐       stdout/json        ┌─────────────────┐       HTTP push       ┌─────────────────┐
│   NestJS API    │ ───────────────────────> │  Grafana Alloy  │ ────────────────────> │  Grafana Loki   │
│  (nestjs-pino)  │   (Docker Container)     │ (Docker socket) │     (:3100)           │ (Chunk Storage) │
└─────────────────┘                          └─────────────────┘                       └────────┬────────┘
                                                                                                │
                                                                                                ▼
                                                                                       ┌─────────────────┐
                                                                                       │     Grafana     │
                                                                                       │  Pino Dashboard │
                                                                                       └─────────────────┘
```

- **Logging Library**: `nestjs-pino` và `pino`
- **Format**:
  - `JSON` (mặc định trong container Docker, Production và Development có monitoring)
  - `pretty` (tùy chọn khi chạy Node trực tiếp trên terminal local với `pino-pretty`)
- **Vận chuyển log**: Grafana Alloy tự động thu thập từ `/var/run/docker.sock`, parse JSON và gắn nhãn trước khi đẩy vào Loki.
- **Trực quan hóa**: Dashboard **`NestJS Pino Application Logs`** được provision sẵn trên Grafana.

---

## 2. Cấu hình biến môi trường

```env
# Mức độ log tối thiểu: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'
LOG_LEVEL=info

# Định dạng xuất ra console: 'json' hoặc 'pretty'
LOG_FORMAT=json
```

> [!IMPORTANT]
> Khi chạy trong Docker cùng với stack monitoring (Alloy + Loki), luôn đảm bảo `LOG_FORMAT=json`. Alloy phụ thuộc vào cấu trúc JSON của Pino để trích xuất các nhãn `level`, `msg`, `context`, `req.id` chính xác.

---

## 3. Cấu trúc Log JSON từ Pino

Mỗi dòng log xuất ra có cấu trúc tiêu chuẩn:

```json
{
  "level": 30,
  "time": 1773305400000,
  "pid": 1,
  "hostname": "8f3ab24c1e",
  "context": "AuditLogService",
  "msg": "Audit event recorded",
  "event": "audit_event",
  "auditEventId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "action": "AUTH_LOGIN_SUCCESS",
  "actorUserId": "3a0b4112-70b9-4824-a78d-9b596f7c5e23",
  "req": {
    "id": "e4a2c070-4927-463e-b7d6-3e75e1f7c001",
    "method": "POST",
    "url": "/api/v1/auth/sign-in"
  },
  "res": {
    "statusCode": 200
  },
  "responseTime": 18
}
```

### Mã hóa Log Levels trong Pino

| Tên Level | Mã số số học | Mô tả sử dụng |
|---|---|---|
| `trace` | 10 | Dấu vết chi tiết nhất phục vụ debug thư viện nội bộ |
| `debug` | 20 | Thông tin kỹ thuật hỗ trợ lập trình viên |
| `info` | 30 | Thông tin hoạt động bình thường của hệ thống |
| `warn` | 40 | Các cảnh báo tiềm ẩn rủi ro (slow query, cache miss cao,...) |
| `error` | 50 | Lỗi nghiệp vụ hoặc ngoại lệ không xử lý được |
| `fatal` | 60 | Lỗi nghiêm trọng khiến tiến trình buộc phải dừng |

---

## 4. Thu thập Logs tự động qua Grafana Alloy

File cấu hình [observability/alloy-config.alloy](file:///d:/Project_AI/Project_Base_NestJS_V3/observability/alloy-config.alloy) thiết lập pipeline thu thập:

1. **Docker Discovery**: Quét toàn bộ container đang chạy qua `discovery.docker`.
2. **Lọc Container**: Đọc log của container API (`flash_cards_api_dev` hoặc container sản phẩm), Postgres, Redis.
3. **Parse Pino JSON**:
   - Chuyển đổi mã số cấp độ (`level: 30`) thành chuỗi nhãn (`level="info"`).
   - Tách các trường `msg`, `context`, `trace` làm nhãn hoặc structured metadata.
4. **Push tới Loki**: Đẩy theo batch về `http://loki:3100/loki/api/v1/push`.

---

## 5. Pre-configured Grafana Dashboard

Dự án đi kèm dashboard dựng sẵn [nestjs-pino-logs.json](file:///d:/Project_AI/Project_Base_NestJS_V3/observability/grafana/dashboards/nestjs-pino-logs.json) trong Grafana:

### Các Panels trên Dashboard:
1. **📝 All Application Logs (Real-time Stream)**:
   - Truy vấn: `{job="docker", container=~".*api.*"} | json`
   - Hiển thị theo màu: Đỏ (error/fatal), Vàng (warn), Xanh (info).
2. **📈 Log Volume by Level over Time**:
   - Biểu đồ thời gian thể hiện số log mỗi phút phân theo `level`.
3. **🥧 Log Level Distribution**:
   - Biểu đồ tròn thể hiện tỷ lệ % giữa các mức độ log.
4. **🚨 Application Errors Only**:
   - Panel lọc riêng các bản ghi lỗi: `{job="docker"} | json | level =~ "error|fatal|50|60"` kèm stack trace.
5. **🗄️ Infrastructure Logs (Postgres & Redis)**:
   - Giám sát log từ cơ sở dữ liệu và cache server để phát hiện lỗi kết nối.

---

## 6. Thực hành Ghi Log trong Mã nguồn

### 6.1. Sử dụng PinoLogger trong NestJS Services

```typescript
import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class OrderService {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(OrderService.name);
  }

  async processOrder(orderId: string, userId: string) {
    this.logger.info({ orderId, userId }, 'Bắt đầu xử lý đơn hàng');

    try {
      // Logic nghiệp vụ...
      this.logger.info({ orderId }, 'Đơn hàng hoàn tất thành công');
    } catch (error) {
      this.logger.error(
        { orderId, userId, err: error },
        'Lỗi xảy ra trong quá trình xử lý đơn hàng',
      );
      throw error;
    }
  }
}
```

### 6.2. Bảo mật & Redaction (Ẩn thông tin nhạy cảm)

Hệ thống Pino được cấu hình tự động ẩn (redact) các trường nhạy cảm trong payload như:
- `password`, `confirmPassword`
- `token`, `accessToken`, `refreshToken`
- `authorization`, `cookie`
- `secret`, `creditCard`

Không bao giờ log trực tiếp mật khẩu thô hoặc token bảo mật vào console.
