# Kiểm thử tải

Kho mã nguồn có kịch bản kiểm thử tải nhanh bằng k6 tại
`tests/load/api-smoke.js`. Kịch bản tăng dần đến 10 người dùng ảo trong một phút,
duy trì trong ba phút rồi giảm tải. Các ngưỡng ban đầu chỉ là giới hạn tham khảo,
không phải SLO production; hãy điều chỉnh theo ngân sách độ trễ và cấu hình phần
cứng của môi trường triển khai.

Cài k6 riêng, triển khai một môi trường staging đại diện rồi chạy:

```sh
k6 run -e BASE_URL=https://staging.example.com \
  -e TARGET_PATH=/health/ready tests/load/api-smoke.js
```

Với route yêu cầu xác thực bearer, hãy cung cấp token kiểm thử có thời hạn ngắn:

```sh
k6 run -e BASE_URL=https://staging.example.com \
  -e TARGET_PATH=/users \
  -e ACCESS_TOKEN="$LOAD_TEST_ACCESS_TOKEN" tests/load/api-smoke.js
```

Dùng tài khoản kiểm thử riêng và dữ liệu không thuộc production. Không chạy kiểm
thử áp lực trên production hoặc dùng thông tin xác thực dài hạn của người dùng
thật. Kịch bản mẫu chỉ là điểm khởi đầu: hãy bổ sung tình huống theo từng route,
thời gian chờ giữa thao tác, bước chuẩn bị dữ liệu và mức đồng thời dự kiến trước
khi dùng kết quả làm điều kiện phát hành. Ghi lại phiên bản API, số replica, giới
hạn CPU/bộ nhớ, kích thước connection pool của database, năng lực Redis, tốc độ
request, độ trễ p95/p99 và tỷ lệ lỗi cho mỗi lượt chạy.

Metrics ứng dụng hiện cung cấp số lượng/độ trễ HTTP request và kết quả
application cache. Rate limiting dùng Redis để chia sẻ hạn mức giữa các API
replica. Metrics về connection pool/query database và độ sâu queue, distributed
tracing cùng cảnh báo riêng cho môi trường triển khai vẫn cần được tích hợp với
runtime và backend telemetry đã chọn.
