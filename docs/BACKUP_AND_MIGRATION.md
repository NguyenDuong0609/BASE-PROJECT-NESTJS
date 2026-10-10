# Quy trình sao lưu và migration (Production)

Tài liệu này mô tả quy trình cập nhật schema database trên môi trường production
nhằm hạn chế mất dữ liệu và hỗ trợ khôi phục khi xảy ra sự cố.

## 1. Nguyên tắc cốt lõi

- **Không dùng `synchronize: true` trên production.** Mọi thay đổi schema phải
  được thực hiện qua migration của TypeORM.
- **Sao lưu database trước khi chạy migration.**
- Chỉ nhân sự được phân quyền (DevOps/trưởng nhóm kỹ thuật) mới được chạy
  migration trên máy chủ production.

## 2. Quy trình triển khai (Staging / Production)

### Bước 1: Sao lưu database

Trước khi phát hành mã mới và chạy migration, hãy tạo snapshot hoặc bản dump
database.

- **AWS RDS:** Tạo snapshot thủ công bằng AWS Console hoặc CLI.
- **Database tự quản lý:** Dùng `pg_dump` hoặc script sao lưu đã được kiểm tra.

```bash
# Ví dụ tạo bản dump PostgreSQL:
PGPASSWORD="your_password" pg_dump -U postgres -h localhost -d nestjs_boilerplate -F c -f backup_pre_release_v1.2.0.dump
```

### Bước 2: Chạy migration

Lệnh migration đọc các tệp trong `src/database/migrations` và áp dụng thay đổi
vào database.

```bash
npm run migration:run
```

### Bước 3: Xác minh

- Khởi động ứng dụng sau khi migration hoàn tất.
- Kiểm tra các endpoint chính và log để xác nhận ứng dụng tương thích với schema mới.

## 3. Quy trình khôi phục khi xảy ra sự cố

Nếu migration thất bại hoặc phát hiện lỗi nghiêm trọng sau khi migrate, hãy đánh
giá phương án khôi phục phù hợp:

### Phương án A: Hoàn tác migration bằng TypeORM

Chỉ dùng khi migration gần nhất có thể đảo ngược an toàn:

```bash
npm run migration:revert
```

Lệnh này chỉ hoàn tác migration cuối cùng. Nếu đã xóa bảng hoặc dữ liệu, lệnh
hoàn tác không thể khôi phục dữ liệu đã mất.

### Phương án B: Phục hồi bản sao lưu

- Phục hồi snapshot RDS hoặc bản sao lưu đã tạo ở bước 1; ưu tiên phục hồi vào
  database riêng để kiểm tra trước.
- Khôi phục phiên bản ứng dụng tương thích với schema đã phục hồi.
- Với production, lập kế hoạch chuyển đổi có kiểm soát; không ghi đè database
  đang hoạt động trước khi đánh giá tác động.

## 4. Các lệnh migration trong `package.json`

- `npm run migration:generate`: Tạo migration từ thay đổi entity; chỉ dùng trong
  development rồi phải review SQL được sinh ra.
- `npm run migration:run`: Chạy các migration chưa được áp dụng.
- `npm run migration:revert`: Hoàn tác migration gần nhất nếu an toàn.
- `npm run migration:show`: Liệt kê trạng thái các migration.
