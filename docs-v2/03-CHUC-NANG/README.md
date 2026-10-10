# Chức năng hệ thống - Tổng quan

Tài liệu mô tả các chức năng chính của hệ thống NestJS Base.

## Tổng quan

Dự án bao gồm 2 loại module:

1. **Core Modules** (Bắt buộc) - Cần thiết cho mọi dự án
2. **Feature Modules** (Tùy chọn) - Domain mẫu có thể bật/tắt

## Core Modules

### 1. Authentication (Auth)

**Mô tả:** Xử lý xác thực và phân quyền người dùng

**Tính năng:**
- Đăng ký bằng email/password
- Đăng nhập với JWT
- Refresh token rotation
- Google OAuth2 (tùy chọn)
- Email verification (tùy chọn)
- Password reset (tùy chọn)

**Endpoints:**
- `POST /auth/sign-up` - Đăng ký
- `POST /auth/sign-in` - Đăng nhập
- `POST /auth/refresh` - Làm mới token
- `POST /auth/logout` - Đăng xuất
- `GET /auth/google` - OAuth Google
- `GET /auth/google/callback` - OAuth callback

**Chi tiết:** [Authentication](authentication.md)

### 2. User Management (Users)

**Mô tả:** Quản lý tài khoản và hồ sơ người dùng

**Tính năng:**
- CRUD người dùng
- Profile management
- Password update
- Avatar upload
- User search

**Endpoints:**
- `GET /users` - Danh sách (Admin)
- `POST /users` - Tạo user (Admin)
- `GET /users/me` - Profile hiện tại
- `GET /users/:id` - Chi tiết user
- `PATCH /users/:id` - Cập nhật user
- `DELETE /users/:id` - Xóa user (Admin)

**Chi tiết:** [User Management](user-management.md)

### 3. Role-Based Access Control (User Roles)

**Mô tả:** Phân quyền theo vai trò (RBAC)

**Tính năng:**
- Định nghĩa roles
- Gán role cho user
- Decorator @Roles
- Guard kiểm tra quyền

**Roles mặc định:**
- `Admin` - Toàn quyền
- `User` - Quyền cơ bản
- `TeamLeader` - Quản lý team

**Endpoints:**
- `GET /user-roles` - Danh sách roles
- `POST /user-roles` - Tạo role
- `GET /user-roles/:id` - Chi tiết role
- `PATCH /user-roles/:id` - Cập nhật role
- `DELETE /user-roles/:id` - Xóa role

## Feature Modules

### 4. Media Upload

**Mô tả:** Tải lên và quản lý file media

**Tính năng:**
- Upload file multipart
- Validation file type/size
- Tích hợp AWS S3
- Presigned download URL
- Metadata tracking

**Endpoints:**
- `POST /media/upload` - Upload file
- `GET /media/:id` - Metadata
- `GET /media/:id/download` - Download URL
- `DELETE /media/:id` - Xóa file

**Feature Flag:** `ENABLE_S3`

**Chi tiết:** [File Upload](file-upload.md)

### 5. Background Jobs (Queue)

**Mô tả:** Xử lý tác vụ nền với BullMQ

**Tính năng:**
- Email queue
- Image processing queue
- Notification queue
- Job monitoring
- Retry with backoff

**Endpoints:**
- `GET /queues/:name/status` - Thống kê queue
- `GET /queues/:name/jobs/:jobId` - Chi tiết job

**Chi tiết:** [Background Jobs](background-jobs.md)

### 6. Comments

**Mô tả:** Hệ thống bình luận phân cấp

**Tính năng:**
- Cây comment (Closure Table)
- Reply unlimited depth
- Ancestor/descendant queries
- Ownership checks

**Endpoints:**
- `POST /comments/posts/:postId` - Tạo comment gốc
- `POST /comments/:commentId/replies` - Tạo reply
- `GET /comments/posts/:postId/tree` - Lấy cây comment
- `GET /comments/:id/ancestors` - Lấy ancestors
- `GET /comments/:id/descendants` - Lấy descendants
- `PATCH /comments/:id` - Cập nhật
- `DELETE /comments/:id` - Xóa

**Feature Flag:** `ENABLE_COMMENTS`

### 7. Check-in

**Mô tả:** Theo dõi điểm danh hằng ngày

**Tính năng:**
- Daily check-in
- Streak tracking
- Reward system
- Statistics

**Endpoints:**
- `POST /checkin` - Check-in
- `GET /checkin/history` - Lịch sử
- `GET /checkin/stats` - Thống kê
- `GET /checkin/status` - Trạng thái hôm nay

**Feature Flag:** `ENABLE_CHECKIN`

### 8. Flash Cards

**Mô tả:** Quản lý flash card học tập

**Tính năng:**
- CRUD flash cards
- Gắn topic
- Collection support
- Search/filter

**Endpoints:**
- `GET /flash-cards` - Danh sách
- `POST /flash-cards` - Tạo mới
- `GET /flash-cards/:id` - Chi tiết
- `PATCH /flash-cards/:id` - Cập nhật
- `DELETE /flash-cards/:id` - Xóa

**Feature Flag:** `ENABLE_FLASH_CARDS`

### 9. Flash Cards State

**Mô tả:** Workflow phê duyệt flash card (State Machine)

**Tính năng:**
- 5 trạng thái: DRAFT → IN_REVIEW → APPROVED_ONE → APPROVED_TWO → PUBLISHED
- State transitions validation
- Role-based transitions
- History tracking

**Endpoints:**
- `GET /flash-cards-state` - Danh sách
- `POST /flash-cards-state` - Tạo draft
- `POST /flash-cards-state/:id/submit` - Gửi review
- `POST /flash-cards-state/:id/approve` - Phê duyệt
- `POST /flash-cards-state/:id/reject` - Từ chối
- `POST /flash-cards-state/:id/publish` - Xuất bản
- `GET /flash-cards-state/:id/transitions` - Lịch sử
- `GET /flash-cards-state/:id/allowed-transitions` - State được phép

**Feature Flag:** `ENABLE_FLASH_CARD_STATES`

### 10. Collections

**Mô tả:** Quản lý bộ sưu tập flash cards

**Tính năng:**
- Tạo collection
- Thêm card vào collection
- Phân trang
- Filter/Search

**Endpoints:**
- `GET /collections` - Danh sách
- `POST /collections` - Tạo mới
- `GET /collections/:id` - Chi tiết
- `PATCH /collections/:id` - Cập nhật
- `DELETE /collections/:id` - Xóa

**Feature Flag:** `ENABLE_COLLECTIONS`

### 11. Topics

**Mô tả:** Phân loại theo chủ đề

**Tính năng:**
- CRUD topics
- Gán flash cards vào topic
- Hierarchical (tương lai)

**Endpoints:**
- `GET /topics` - Danh sách
- `POST /topics` - Tạo mới
- `GET /topics/:id` - Chi tiết
- `PATCH /topics/:id` - Cập nhật
- `DELETE /topics/:id` - Xóa

**Feature Flag:** `ENABLE_TOPICS`

## Feature Flags

Điều khiển các module tùy chọn qua biến môi trường:

```env
# Domain modules
ENABLE_FLASH_CARDS=false
ENABLE_COLLECTIONS=false
ENABLE_TOPICS=false
ENABLE_CHECKIN=false
ENABLE_COMMENTS=false
ENABLE_FLASH_CARD_STATES=false
ENABLE_STUDENT_CARD_UPLOADS=false

# Integrations
ENABLE_S3=false
ENABLE_GOOGLE_OAUTH=false
ENABLE_ACCOUNT_EMAIL_FLOWS=false
REQUIRE_VERIFIED_EMAIL=false

# Observability
ENABLE_METRICS=false
```

**Lưu ý:**
- Feature flag chỉ ẩn route, không xóa module/schema
- Để loại bỏ hoàn toàn, cần xóa module code và migration

## Audit & Observability

### Audit Logging

**Mô tả:** Ghi log các sự kiện quan trọng

**Events được ghi:**
- Authentication (login, logout, failed attempts)
- User lifecycle (create, update, delete)
- Role changes
- Check-in
- Admin actions

**Endpoints:**
- `GET /audit/events` - Lọc events (Admin)
- `GET /audit/user/:userId` - Events theo user
- `GET /audit/resource/:type/:id` - Events theo resource

### Health Checks

**Endpoints:**
- `GET /health/live` - Process liveness
- `GET /health/ready` - Dependency readiness (PostgreSQL, Redis)

### Metrics

**Endpoint:** `GET /metrics` (Prometheus format)

**Metrics được thu thập:**
- HTTP request counts
- Request duration
- Queue sizes
- Cache hit/miss

**Feature Flag:** `ENABLE_METRICS`

## Bảng tổng quan module

| Module | Bắt buộc | Database | Feature Flag | Trạng thái |
|--------|----------|----------|--------------|------------|
| auth | ✅ | ✅ | - | Core |
| users | ✅ | ✅ | - | Core |
| user-roles | ✅ | ✅ | - | Core |
| media | ❌ | ✅ | ENABLE_S3 | Optional |
| queue | ❌ | Redis | - | Optional |
| comments | ❌ | ✅ | ENABLE_COMMENTS | Domain mẫu |
| checkin | ❌ | ✅ | ENABLE_CHECKIN | Domain mẫu |
| flash-cards | ❌ | ✅ | ENABLE_FLASH_CARDS | Domain mẫu |
| flash-cards-state | ❌ | ✅ | ENABLE_FLASH_CARD_STATES | Domain mẫu |
| collections | ❌ | ✅ | ENABLE_COLLECTIONS | Domain mẫu |
| topics | ❌ | ✅ | ENABLE_TOPICS | Domain mẫu |

## Tài liệu liên quan

- [Authentication](authentication.md)
- [User Management](user-management.md)
- [File Upload](file-upload.md)
- [Background Jobs](background-jobs.md)
- [Domain Modules](domain-modules.md)
- [Configuration](../05-CAU-HINH/feature-flags.md)
