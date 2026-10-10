# Hệ thống cảnh báo và giám sát

Khi hệ thống gặp sự cố nghiêm trọng (ngừng hoạt động, kiểm tra tình trạng thất
bại) hoặc số lượng lỗi 500 tăng đột biến, việc nhận thông báo kịp thời là rất
quan trọng.

## 1. Các cấp độ theo dõi

`GET /metrics` hiện xuất HTTP request count/latency, application-cache outcome
(hit/miss/bypass/error) và queue counts. Cần scrape từng replica. Các ngưỡng bên dưới là ví dụ,
hãy đặt alert theo SLO và hạ tầng thật; metrics DB pool/query,
distributed tracing và alert routing chưa được tích hợp sẵn trong source.

### 1.1 Theo dõi tính sẵn sàng

- **Công cụ đề xuất:** UptimeRobot, Better Stack, CloudWatch Synthetics.
- **Thiết lập:**
  - Gửi request `GET /health/ready` mỗi 30 - 60 giây.
  - Ngưỡng cảnh báo: Request timeout (> 5 giây) hoặc trả về HTTP Status code `!= 200` (như `503 Service Unavailable`).
- **Xử lý:** Gửi cảnh báo khi hệ thống ngừng hoạt động liên tục quá một phút.

### 1.2 Theo dõi lỗi ứng dụng

- **Công cụ đề xuất:** Sentry.
- **Thiết lập:** Sentry SDK ghi nhận các ngoại lệ chưa được xử lý và lỗi `5xx`.
- **Ngưỡng cảnh báo:**
  - Xuất hiện lỗi mới chưa từng ghi nhận.
  - Số lượng lỗi tăng bất thường (ví dụ: trên 20 lỗi trong 5 phút).

### 1.3 Theo dõi hạ tầng

- **Thiết lập:** Theo dõi mức sử dụng CPU/bộ nhớ của container hoặc VPS.
- **Ngưỡng cảnh báo:** CPU trên 85% hoặc RAM trên 90% liên tục hơn 5 phút.

## 2. Kênh nhận cảnh báo

- **Cảnh báo nghiêm trọng (ngừng dịch vụ, lỗi tăng đột biến):**
  - Kênh Slack/Teams `#alerts-production` (gắn thẻ `@here` hoặc `@channel`).
  - PagerDuty hoặc gọi điện/SMS cho người trực, kể cả ngoài giờ làm việc.
- **Cảnh báo cần lưu ý (lỗi riêng lẻ, CPU tăng cao tạm thời):**
  - Kênh Slack/Teams `#logs-production` (chỉ thông báo, không gắn thẻ thành viên).

## 3. Trách nhiệm của người trực

- Người trực cần xác nhận đã nhận cảnh báo trong vòng 15 phút.
- Nếu không thể xử lý, cần liên hệ ngay với trưởng nhóm kỹ thuật hoặc lập trình
  viên phụ trách module liên quan.
