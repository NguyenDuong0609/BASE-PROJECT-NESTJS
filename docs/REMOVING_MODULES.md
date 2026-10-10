# Hướng dẫn thêm hoặc xóa module (cho dự án mới)

NestJS Boilerplate này đi kèm với nhiều tính năng nâng cao (Queue, S3, Flow FlashCard, Check-in...). Khi clone base về cho một dự án thực tế, bạn có thể không cần tất cả các module này. Hãy gỡ bỏ các module thừa để code sạch và nhẹ hơn.

## 1. Phân loại module

### Module cốt lõi (BẮT BUỘC GIỮ)
- `AuthModule`: Xác thực, Token, Google OAuth.
- `UsersModule`: Quản lý người dùng, hồ sơ.
- `UserRolesModule`: Phân quyền RBAC.
- `HealthModule`: Terminus Health checks.
- `AuditModule`: Audit Logging (Nên giữ cho production).

### Module tùy chọn (CÓ THỂ XÓA TÙY DỰ ÁN)
- `QueueModule`: Background jobs (BullMQ). Xóa nếu không có tác vụ chạy ngầm.
- `MailModule`: Gửi email. Xóa nếu không gửi mail.
- `MediaModule`: S3 Upload. Xóa nếu lưu file nội bộ hoặc không xử lý file.
- `TopicsModule`, `FlashCardsModule`, `FlashCardsStateModule`: Logic nghiệp vụ demo của Base. **Chắc chắn nên xóa** trong dự án thật.
- `CommentsModule`: Logic bình luận phân cấp.
- `CheckinModule`: Logic điểm danh hằng ngày.

## 2. Quy trình xóa một module (ví dụ: `FlashCardsModule`)

1. **Xóa import trong `AppModule`:**
   Mở `src/app.module.ts`, xóa `FlashCardsModule` khỏi mảng `imports`. Đồng thời xóa dòng `import { FlashCardsModule } ...` ở đầu tệp.
2. **Xóa folder code:**
   Xóa toàn bộ thư mục `src/modules/flash-cards`.
3. **Xóa Repository:**
   Xóa tệp `src/repositories/flash-cards.repository.ts`.
4. **Xóa các Entities khỏi DB:**
   - Xóa thư mục/file Migration tạo bảng của module đó (trong `src/database/migrations`) nếu chưa migrate.
   - Nếu đã migrate ở Staging/Prod: Viết file Migration mới chứa lệnh `DROP TABLE flash_cards;`.
5. **Dọn dẹp Route/Swagger:**
   Nest sẽ tự động loại bỏ các route của module bị xóa khỏi Swagger.
6. **Kiểm tra biên dịch:**
   Chạy `npm run build` để đảm bảo không còn tệp nào phụ thuộc vào module vừa bị xóa.
