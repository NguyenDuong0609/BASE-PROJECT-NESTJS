# Quản lý bí mật và biến môi trường (Production)

## 1. Nguyên tắc bắt buộc

- **Không bao giờ commit** `.env`, `.env.prod` hoặc `.env.staging` vào Git.
- Chỉ commit `.env.example` và bảo đảm tệp mẫu không chứa giá trị bí mật thật.
- Kiểm tra `.gitignore` loại trừ các tệp môi trường và thư mục chứa khóa:

  ```gitignore
  .env
  .env.*
  !.env.example
  secure/
  ```

## 2. Tách biệt staging và production

Không dùng chung tài nguyên giữa staging và production để tránh rò rỉ dữ liệu và
tác động ngoài ý muốn:

- **Database (`DB_DATABASE`):** Dùng database riêng cho mỗi môi trường.
- **Redis (`REDIS_DB` hoặc URI):** Dùng instance hoặc chỉ số database riêng.
- **AWS S3 (`AWS_S3_BUCKET`):** Dùng bucket riêng, ví dụ
  `my-app-staging-media` và `my-app-prod-media`.
- **Cấu hình:** Điều chỉnh connection pool, giới hạn tốc độ request và mức log
  riêng cho mỗi môi trường; không coi giá trị staging là mặc định phù hợp cho
  production.

## 3. Nơi lưu trữ bí mật production

### Phương án A: Dịch vụ quản lý bí mật trên nền tảng đám mây (khuyến nghị)

- **AWS:** Secrets Manager hoặc SSM Parameter Store.
- **GCP:** Secret Manager.
- **Azure:** Key Vault.
- **Doppler:** Quản lý bí mật đa nền tảng.

### Phương án B: Biến bảo vệ của CI/CD

- **GitHub Actions:** Repository Secrets trong phần cài đặt repository.
- **GitLab CI:** CI/CD Variables trong phần cài đặt dự án hoặc nhóm.

### Phương án C: Bí mật của Docker/Kubernetes

- **Docker:** Dùng `docker secret create` hoặc gắn tệp môi trường bên ngoài image.
- **Kubernetes:** Dùng `kubectl create secret generic` và mount secret vào pod.

## 4. Đưa bí mật vào ứng dụng

Ví dụ dùng Docker Compose cho development:

```yaml
services:
  app:
    env_file:
      - .env.dev # Không commit tệp này.
```

Ví dụ khai báo secret trong Kubernetes:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  DB_PASSWORD: <base64-encoded-value>
  JWT_ACCESS_TOKEN_SECRET: <base64-encoded-value>
```

```yaml
# deployment.yaml
envFrom:
  - secretRef:
      name: app-secrets
```

Lưu ý: Kubernetes yêu cầu giá trị trong trường `data` được mã hóa Base64; Base64
không phải mã hóa bảo mật. Hãy dùng secret manager và phân quyền truy cập phù hợp.

## 5. Các bí mật cần bảo vệ

| Biến môi trường | Mục đích | Cách tạo/cấp |
| --- | --- | --- |
| `DB_PASSWORD` | Mật khẩu PostgreSQL | Tạo ngẫu nhiên, tối thiểu 32 ký tự |
| `JWT_ACCESS_TOKEN_SECRET` | Ký access token | Tạo giá trị ngẫu nhiên dài tối thiểu 32 ký tự |
| `JWT_REFRESH_TOKEN_SECRET` | Ký refresh token | Tạo giá trị ngẫu nhiên độc lập với access secret |
| `GOOGLE_CLIENT_SECRET` | Bí mật OAuth Google | Google Cloud Console |
| `AWS_SECRET_ACCESS_KEY` | Bí mật thông tin truy cập AWS | IAM/role của AWS |
| `REDIS_PASSWORD` | Mật khẩu Redis | Tạo chuỗi ngẫu nhiên đủ mạnh |
| `SMTP_PASSWORD` | Mật khẩu máy chủ SMTP | Nhà cung cấp email |
| `GRAFANA_ADMIN_PASSWORD` | Mật khẩu quản trị Grafana | Tạo riêng và lưu trong kho bí mật |

## 6. Luân chuyển khóa và mật khẩu

Thực hiện luân chuyển khi nghi ngờ lộ bí mật, khi nhân sự có quyền truy cập rời
nhóm, hoặc theo lịch bảo mật nội bộ.

### Luân chuyển JWT secret

1. Tạo secret mới, độc lập với secret hiện tại.
2. Cập nhật staging và xác nhận xác thực/token hoạt động đúng.
3. Cập nhật secret production theo kế hoạch phát hành.
4. Khởi động lại ứng dụng một cách an toàn.
5. Đánh giá tác động tới token đang hoạt động; token ký bằng secret cũ có thể
   mất hiệu lực và yêu cầu người dùng đăng nhập lại.

### Luân chuyển mật khẩu database

1. Đổi mật khẩu trên PostgreSQL theo quy trình không làm lộ mật khẩu.
2. Cập nhật `DB_PASSWORD` trong kho bí mật của môi trường.
3. Khởi động lại API một cách an toàn.
4. Kiểm tra `GET /health/ready` và xác nhận kết nối database.

## 7. Danh sách kiểm tra bảo mật

- [ ] `.gitignore` loại trừ tệp `.env*` nhưng vẫn cho phép `.env.example`.
- [ ] Thư mục `secure/` chứa khóa riêng được loại trừ khỏi Git.
- [ ] Không đóng gói bí mật vào source code hoặc Docker image.
- [ ] Ứng dụng nhận bí mật qua môi trường/kho bí mật được quản lý.
- [ ] Có quy trình luân chuyển khóa và mật khẩu.
- [ ] Chỉ người có thẩm quyền mới được truy cập bí mật production.
