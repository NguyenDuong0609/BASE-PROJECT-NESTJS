# Hướng dẫn xử lý tác vụ nền (Queue) thất bại

Ứng dụng dùng **BullMQ** kết hợp **Redis** để xử lý tác vụ nền như gửi email,
xử lý ảnh và gửi thông báo. Trong môi trường production, tác vụ vẫn có thể thất
bại do lỗi mạng, dịch vụ bên thứ ba tạm ngừng hoặc các sự cố khác.

## 1. Cơ chế thử lại tự động và giãn cách

Khi đưa tác vụ vào queue, hệ thống đã cấu hình cơ chế thử lại:

- **Tác vụ email:** Thử lại tối đa 3 lần, thời gian chờ tăng theo cấp số nhân
  (2 giây, 4 giây, 8 giây).
- **Tác vụ xử lý ảnh:** Thử lại tối đa 2 lần, chờ cố định 5 giây.
- **Tác vụ thông báo:** Thử lại tối đa 3 lần, thời gian chờ tăng theo cấp số
  nhân, bắt đầu từ 1 giây.

Khi tác vụ thất bại, BullMQ sẽ tự đưa tác vụ vào hàng đợi để thử lại theo thời
gian chờ đã cấu hình.

## 2. Ghi log và cảnh báo lỗi

Mỗi processor (ví dụ `email.processor.ts`, `image.processor.ts`) gắn listener
`@OnWorkerEvent('failed')`.

- Khi tác vụ thất bại, hệ thống ghi log mức `ERROR` qua Pino, kèm mã tác vụ và
  nguyên nhân lỗi.
- Nếu dự án tích hợp Sentry, hãy cấu hình gửi lỗi tới Sentry để nhóm nhận được
  thông báo. Source hiện tại không tự tích hợp Sentry.

## 3. Xử lý thủ công tác vụ thất bại vĩnh viễn

Sau khi đã thử lại hết số lần tối đa mà vẫn thất bại, tác vụ chuyển sang trạng
thái `failed` và không tự chạy lại nữa.

### Cách xử lý

1. **Dùng API theo dõi queue:** Gọi `GET /queues/:name/status` để xem thống kê
   tác vụ thất bại. Gọi `GET /queues/:name/jobs/:id` để xem `failedReason` của
   một tác vụ cụ thể.
2. **Dùng Bull Board (tùy chọn):** Nếu dự án đã cài và bảo vệ giao diện Bull Board
   trên endpoint nội bộ, có thể dùng giao diện để thử lại hoặc dọn tác vụ thủ công.
3. **Dùng Redis CLI chỉ khi khẩn cấp:** Tránh sửa trực tiếp cấu trúc Redis của
   BullMQ. Ưu tiên viết script dùng API BullMQ, chẳng hạn `job.retry()`, sau khi
   xác minh queue và tác vụ mục tiêu.
