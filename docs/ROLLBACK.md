# Hướng dẫn khôi phục phiên bản (Production)

Nếu ứng dụng gặp sự cố nghiêm trọng (lỗi nghiêm trọng, ngừng hoạt động hoặc hiệu
năng suy giảm) sau khi triển khai production, hãy thực hiện quy trình khôi phục
dưới đây.

## 1. Khôi phục phiên bản ứng dụng

CI/CD gắn thẻ Docker image bằng SHA của commit (`$CI_COMMIT_SHA`). Có thể khôi
phục ứng dụng bằng cách triển khai lại một image của phiên bản trước.

1. Mở giao diện GitLab hoặc công cụ CI/CD của dự án.
2. Tìm pipeline của lần triển khai thành công gần nhất.
3. Chạy lại job `deploy:production` của pipeline đó.
4. Nếu phải thao tác thủ công, cập nhật image tag trong cấu hình Docker Compose
   hoặc Kubernetes về SHA cũ rồi khởi động lại container/pod.
5. Kiểm tra `GET /health/ready` để xác nhận ứng dụng cùng các dependency đã sẵn
   sàng.

Không sửa mã trực tiếp trên máy chủ production. Hãy khôi phục dịch vụ trước,
sau đó tái hiện lỗi ở môi trường staging/development, sửa mã, kiểm thử và phát
hành lại theo quy trình bình thường.

## 2. Khôi phục cơ sở dữ liệu

Khôi phục database có rủi ro mất dữ liệu cao hơn khôi phục ứng dụng. Chỉ thực
hiện khi có hỏng dữ liệu nghiêm trọng hoặc schema mới không tương thích.

### Trường hợp 1: Migration tương thích ngược

Nếu migration không xóa bảng/cột và phiên bản ứng dụng cũ vẫn tương thích:

- Khôi phục ứng dụng về SHA cũ.
- Thông thường không cần khôi phục database. Chỉ chạy
  `npm run migration:revert` khi đã xác nhận thao tác `down()` an toàn và cần
  thiết; không xóa schema nếu ứng dụng cũ vẫn hoạt động bình thường.

### Trường hợp 2: Migration làm mất dữ liệu

Nếu migration đã xóa bảng/cột, `migration:revert` không thể tái tạo dữ liệu đã
mất. Hãy dùng bản sao lưu:

1. Dừng API để ngăn dữ liệu tiếp tục thay đổi.
2. Không xóa database hiện tại trước khi lưu lại bản sao phục vụ điều tra.
3. Khôi phục bản sao lưu tạo trước khi phát hành vào một database riêng, rồi
   kiểm tra dữ liệu và phiên bản ứng dụng tương thích.
4. Lập kế hoạch chuyển đổi có kiểm soát; chỉ thay database production sau khi
   được phê duyệt.
5. Khởi động ứng dụng phiên bản cũ và kiểm tra `/health/ready`.

Ví dụ lệnh phục hồi cần điều chỉnh theo tên database và phương án backup thực tế:

```bash
pg_restore -U postgres -d nestjs_boilerplate -1 backup_pre_release.dump
```

## 3. Quyền hạn và thông báo

- Chỉ người có thẩm quyền vận hành production (ví dụ DevOps hoặc trưởng nhóm kỹ
  thuật) mới được thực hiện khôi phục.
- Thông báo cho nhóm khi bắt đầu và hoàn tất thao tác.
- Sau khi dịch vụ ổn định, tổ chức buổi rà soát sự cố để xác định nguyên nhân
  gốc và biện pháp phòng ngừa.
