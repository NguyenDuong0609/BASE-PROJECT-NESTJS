# Migration cơ sở dữ liệu

Thư mục này chứa các migration TypeORM dùng để quản lý quá trình thay đổi schema cơ sở dữ liệu.

## Các lệnh hiện có

### Tạo migration mới
So sánh trạng thái cơ sở dữ liệu hiện tại với các entity để tạo migration:
```bash
npm run migration:generate -- src/database/migrations/MigrationName
```

### Chạy các migration đang chờ
Thực thi tất cả migration chưa được áp dụng:
```bash
npm run migration:run
```

### Hoàn tác migration gần nhất
Hoàn tác migration được thực thi gần đây nhất:
```bash
npm run migration:revert
```

### Xem trạng thái migration
Hiển thị các migration đã được chạy:
```bash
npm run migration:show
```

## Thực hành tốt nhất khi dùng migration

### 1. Quy ước đặt tên
- Dùng PascalCase cho tên migration: `InitialSchema`, `AddGoogleAuth`, `CreateMediaTable`
- TypeORM tự động thêm dấu thời gian vào trước tên

### 2. Cấu trúc migration
Mỗi migration có hai phương thức:
- `up()`: Áp dụng các thay đổi vào cơ sở dữ liệu
- `down()`: Hoàn tác các thay đổi (nên đảo ngược toàn bộ nội dung đã thực hiện trong `up()`)

### 3. Tạo migration

**Cách A: Tự động tạo từ entity**
```bash
npm run migration:generate -- src/database/migrations/MigrationName
```
Lệnh này so sánh các entity với schema cơ sở dữ liệu hiện tại rồi tạo các câu lệnh SQL cần thiết.

**Cách B: Tạo migration rỗng**
```bash
npx typeorm migration:create src/database/migrations/MigrationName
```
Sau đó tự viết SQL trong các phương thức `up()` và `down()`.

### 4. Chạy migration

Luôn chạy migration theo thứ tự sau:
1. Development: Kiểm thử cục bộ trước
2. Staging: Triển khai và kiểm thử trong môi trường staging
3. Production: Chỉ triển khai production sau khi đã kiểm thử kỹ lưỡng

### 5. Hướng dẫn quan trọng

- **Không bao giờ chỉnh sửa migration hiện có** đã được chạy trong production
- Luôn kiểm thử cả hai phương thức `up()` và `down()`
- Đảm bảo `down()` hoàn tác đầy đủ các thay đổi do `up()` tạo ra
- Dùng transaction khi có thể để bảo đảm thao tác nguyên tử
- Thêm index cho các cột thường được truy vấn
- Giải thích các migration phức tạp bằng chú thích

### 6. Thiết lập môi trường

Đảm bảo file `.env` có thông tin xác thực cơ sở dữ liệu chính xác:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=nestjs_boilerplate
DB_LOGGING=false
```

## Quy trình migration

### Quy trình phát triển
1. Chỉnh sửa các entity
2. Tạo migration: `npm run migration:generate -- src/database/migrations/DescriptiveName`
3. Rà soát SQL được tạo
4. Chạy migration: `npm run migration:run`
5. Kiểm thử các thay đổi
6. Nếu phát hiện vấn đề, hoàn tác: `npm run migration:revert`

### Triển khai production
1. Đảm bảo tất cả migration được đưa vào hệ thống quản lý phiên bản
2. Chạy `npm run migration:run` trong pipeline triển khai
3. Ứng dụng sẽ sử dụng schema đã cập nhật

## Khắc phục sự cố

### Migration lỗi với thông báo "relation already exists"
- Có thể cơ sở dữ liệu không đồng bộ với lịch sử migration
- Kiểm tra bằng lệnh: `npm run migration:show`
- Tự sửa cơ sở dữ liệu hoặc khởi tạo lại từ đầu trong môi trường development

### Migration không tạo ra thay đổi nào
- Đảm bảo cơ sở dữ liệu đang chạy
- Kiểm tra các entity đã được khai báo decorator đúng cách
- Xác minh cấu hình `data-source.ts` chính xác

### Không thể kết nối đến cơ sở dữ liệu
- Xác minh cơ sở dữ liệu đang chạy bằng `docker ps` hoặc kiểm tra PostgreSQL cục bộ
- Kiểm tra các biến môi trường trong file `.env`
- Đảm bảo thông tin xác thực cơ sở dữ liệu chính xác

## Schema hiện tại

Schema ban đầu bao gồm:
- **user_roles**: Phân quyền truy cập theo vai trò
- **users**: Tài khoản người dùng có hỗ trợ OAuth
- **addresses**: Địa chỉ người dùng (quan hệ một-nhiều)
- **topics**: Chủ đề flash card
- **collections**: Bộ sưu tập flash card của người dùng
- **flash_cards**: Thẻ học tập
- **flash_cards_state**: Flash card có trạng thái workflow
- **flash_card_transitions**: Lịch sử chuyển trạng thái
- **media_files**: Metadata của các file đã tải lên
- **comments**: Bình luận phân cấp
- **comment_closures**: Cấu trúc cây bình luận (mẫu closure table)
- **checkins**: Bản ghi điểm danh hằng ngày
- **checkin_stats**: Thống kê điểm danh tổng hợp

## Tài liệu tham khảo

- [Tài liệu migration TypeORM](https://typeorm.io/migrations)
- [Tài liệu PostgreSQL](https://www.postgresql.org/docs/)
