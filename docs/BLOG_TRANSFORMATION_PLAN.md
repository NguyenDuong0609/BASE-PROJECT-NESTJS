# 🚀 Kế hoạch triển khai: Chuyển đổi mã nguồn thành nền tảng blog

Tài liệu này vạch ra lộ trình (Plan) chuyển đổi hệ thống hiện tại thành một nền tảng **Blog / Tạp Chí Điện Tử** chuyên nghiệp, tận dụng tối đa các module cốt lõi có sẵn (Auth, Media, Tree Comments, Queue, Base Repositories).

---

## 📦 I. Phân tích và quản lý module (thêm, bớt, giữ nguyên)

### 1. ✅ Module giữ nguyên và tái sử dụng
- **Auth Module**: Đăng nhập/Đăng ký độc giả & tác giả (JWT, Refresh Token, Google OAuth2).
- **Users Module**: Quản lý profile tác giả, độc giả, avatar, thông tin liên hệ.
- **User Roles Module**: Phân quyền hệ thống (`Admin`, `Editor` - Biên tập viên, `Author` - Tác giả, `Reader` - Độc giả).
- **Comments Module**: Tận dụng 100% **Cây bình luận đa cấp (Hierarchical Tree Comments)** cho các bài viết Blog.
- **Media Module**: Quản lý upload ảnh đại diện bài viết (Featured Image) & ảnh nội dung bài viết lên AWS S3.
- **Queue Module**: Hàng đợi gửi Email tin tức (Newsletter), nén ảnh đại diện, xử lý tác vụ ngầm.

---

### 2. ❌ Module lược bỏ
- **Flash Cards Module**: Xóa bỏ (Đặc thù thẻ học từ vựng).
- **Flash Cards State Module**: Xóa bỏ (Chuyển đổi logic duyệt sang Post State).
- **Checkin Module**: Xóa bỏ (Không cần thiết cho ứng dụng Blog chuẩn).

---

### 3. ➕ Module mới và module cần chuyển đổi

#### 📝 A. Posts Module (quản lý bài viết)
- **Mô tả**: Module trung tâm của Blog. Quản lý tiêu đề, slug URL (SEO), tóm tắt (excerpt), nội dung (Markdown/HTML), ảnh đại diện (featured_image), lượt xem (view_count), thời gian đọc ước tính (read_time).
- **Workflow (Áp dụng State Pattern từ FlashCardState)**:<br>
  `Draft` (Nháp) ➔ `Pending Review` (Chờ biên tập duyệt) ➔ `Published` (Đã xuất bản) ➔ `Archived` (Lưu trữ/Ẩn).

#### 🏷️ B. Categories Module (quản lý chuyên mục)
- **Mô tả**: Quản lý cây chuyên mục bài viết (Ví dụ: *Công nghệ*, *Đời sống*, *Lập trình NestJS*). Cho phép chuyên mục cha - con.

#### 🏷️ C. Tags Module (quản lý thẻ bài viết)
- **Mô tả**: Gán các thẻ (hashtag/SEO tags) cho bài viết để tìm kiếm & gợi ý bài viết liên quan.

#### 🔖 D. Bookmarks / Favorites Module (bài viết đã lưu)
- **Mô tả**: Cho phép độc giả lưu lại các bài viết yêu thích để đọc sau.

#### 📧 E. Subscriptions / Newsletter Module (đăng ký nhận tin)
- **Mô tả**: Độc giả đăng ký Email để nhận thông báo tự động (qua Queue) mỗi khi tác giả xuất bản bài viết mới.

---

## 🗓️ II. Các bước thực hiện chuyển đổi

```
[Bước 1: Dọn dẹp] ──► [Bước 2: Tạo module cốt lõi] ──► [Bước 3: Tích hợp dịch vụ] ──► [Bước 4: SEO và API] ──► [Bước 5: Kiểm thử và triển khai]
```

### 1. Bước 1: Dọn dẹp và chuẩn bị nền tảng
- Gỡ bỏ các router/service của `flash-cards`, `flash-cards-state`, `checkin`.
- Giữ lại các base abstract classes (`BaseEntity`, `BaseRepositoryAbstract`, `BaseServiceAbstract`).

### 2. Bước 2: Phát triển các module blog cốt lõi
- Tạo Entity, Repository, Service, Controller cho **Categories** & **Tags**.
- Tạo Entity **Post** kế thừa `BaseEntity` (thêm các trường SEO, slug, content).
- Xây dựng **Post State Pattern** để Biên tập viên duyệt bài trước khi xuất bản.

### 3. Bước 3: Tích hợp các dịch vụ cốt lõi
- Connect **Comments Module** với **Post ID** (cho phép bình luận cây dưới mỗi bài viết).
- Connect **Media Module** với **Post Featured Image** (tải ảnh bài viết lên S3).
- Connect **Queue Module** gửi Mail tự động cho độc giả đăng ký khi bài viết chuyển sang trạng thái `Published`.

### 4. Bước 4: Tối ưu SEO, phân trang và tìm kiếm
- Bổ sung tìm kiếm bài viết theo từ khóa, lọc theo Category / Tag / Tác giả.
- Phân trang bài viết (`offset`, `limit` hoặc Cursor-based).
- Tự động sinh `slug` thân thiện SEO từ tiêu đề bài viết.

### 5. Bước 5: Kiểm thử, cập nhật tài liệu và triển khai
- Cập nhật Swagger API Docs cho các API Blog mới.
- Chạy `npm run build` kiểm tra biên dịch TypeScript.
- Chạy E2E Tests cho luồng Tạo bài nháp ➔ Duyệt bài ➔ Xuất bản ➔ Bình luận.
- Deploy lên môi trường Staging/Production qua Docker Compose.

---

## 🎯 Tổng kết lộ trình

| Hạng mục | Khối lượng ước tính | Mức độ phức tạp |
| :--- | :--- | :--- |
| **Dọn dẹp code cũ** | ~1 - 2 giờ | Rất dễ |
| **Xây dựng Categories & Tags** | ~2 - 3 giờ | Dễ |
| **Xây dựng Posts Module + Workflow** | ~4 - 6 giờ | Trung bình |
| **Tích hợp Comments, S3, Queue Mail** | ~2 - 3 giờ | Dễ (đã có sẵn core) |
| **SEO, Tìm kiếm & Testing** | ~3 - 4 giờ | Trung bình |
| **Tổng thời gian dự kiến** | **~12 - 18 giờ** | **Đã sẵn sàng 70% từ Boilerplate** |
