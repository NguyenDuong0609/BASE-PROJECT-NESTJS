# Hướng dẫn tích hợp Queue

## Tổng quan

Các processor của queue hiện dùng triển khai mô phỏng. Hướng dẫn này mô tả cách
tích hợp dịch vụ thực tế.

## Processor gửi email
- Vị trí: `src/modules/queue/processors/email.processor.ts`
- Cần làm: Tích hợp SendGrid, AWS SES hoặc Mailgun.
- Cài đặt: `npm install @sendgrid/mail`
- Biến môi trường: `SENDGRID_API_KEY`, `DEFAULT_FROM_EMAIL`

## Processor xử lý ảnh
- Vị trí: `src/modules/queue/processors/image.processor.ts`
- Cần làm: Tích hợp Sharp để xử lý ảnh.
- Cài đặt: `npm install sharp`
- Thao tác: đổi kích thước, nén ảnh, tạo ảnh thumbnail.

## Processor gửi thông báo
- Vị trí: `src/modules/queue/processors/notification.processor.ts`
- Cần làm: Tích hợp Firebase FCM, OneSignal hoặc AWS SNS.
- Cài đặt: `npm install firebase-admin`
- Biến môi trường: thông tin xác thực Firebase.

## Các bước tiếp theo
1. Chọn nhà cung cấp dịch vụ.
2. Cài đặt các dependency.
3. Thay phần triển khai mô phỏng bằng tích hợp thực tế.
4. Bổ sung biến môi trường.
5. Kiểm thử với dữ liệu thực tế phù hợp.
