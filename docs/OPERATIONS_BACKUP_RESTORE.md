# Sao lưu và khôi phục PostgreSQL

Đây là ví dụ dùng Docker Compose cục bộ, không thay thế hệ thống lưu trữ bản sao
lưu được mã hóa bên ngoài máy chủ, chính sách lưu giữ, khôi phục theo thời điểm
(point-in-time recovery) hoặc các mục tiêu RPO/RTO đã được kiểm thử.

## Tạo bản sao lưu logic

Chạy lệnh sau từ thư mục gốc repository khi đã có `.env.prod` được bảo vệ. Tệp
lưu trữ được tạo trên host; cần mã hóa và sao chép ngay sang vùng lưu trữ độc lập.
Không commit tệp này.

```sh
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T postgres_db \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > backup.dump
```

Kiểm tra danh sách nội dung của tệp trước khi di chuyển:

```sh
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T postgres_db \
  pg_restore --list < backup.dump
```

## Khôi phục vào database riêng

Trước tiên, hãy khôi phục vào một database mới, đang trống. Không ghi đè database
production đang hoạt động ngay ở bước khôi phục đầu tiên. Kiểm tra schema, trạng
thái migration, số lượng bản ghi và tình trạng ứng dụng trước khi lập kế hoạch
chuyển đổi có kiểm soát.

```sh
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T postgres_db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c 'CREATE DATABASE restore_validation'
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T postgres_db \
  pg_restore --exit-on-error --no-owner -U "$POSTGRES_USER" \
  -d restore_validation < backup.dump
```

Nếu image database không có phiên bản PostgreSQL client cần dùng, hãy chạy một
container client tạm thời trong mạng Compose riêng tư, cùng phiên bản major với
server. Không đưa thông tin xác thực vào tham số dòng lệnh hoặc lịch sử shell.

## Yêu cầu vận hành

- Xác định tần suất sao lưu, đích lưu trữ ngoài host có mã hóa, thời hạn lưu giữ
  và chính sách truy cập.
- Theo dõi trạng thái job sao lưu và dung lượng còn lại; cảnh báo khi bỏ lỡ lịch sao lưu.
- Định kỳ diễn tập khôi phục và ghi nhận thời gian phục hồi cùng khoảng dữ liệu có
  thể bị mất thực tế.
- Sao lưu riêng các tệp đã tải lên nếu dự án dùng object storage.
- Điều phối thời hạn lưu bản sao lưu theo yêu cầu quyền riêng tư, xóa dữ liệu và
  quy định pháp lý.
