# API Documentation - Tổng quan

Tài liệu tổng quan về API của dự án NestJS Base.

## Tổng quan

API RESTful được xây dựng với NestJS 12, sử dụng:

- **Authentication**: JWT Bearer tokens
- **Documentation**: Swagger/OpenAPI 3.0
- **Response Format**: JSON envelope chuẩn hóa
- **Validation**: class-validator + class-transformer
- **Error Handling**: Centralized exception filter

## Base URL

- **Development**: `http://localhost:3000`
- **Staging**: `https://staging.yourdomain.com`
- **Production**: `https://yourdomain.com`

## Authentication

### JWT Bearer Token

```http
Authorization: Bearer <access_token>
```

### Cookie-based Auth (tùy chọn)

```http
Cookie: access_token=<token>; refresh_token=<token>
x-csrf-token: <csrf_token>
```

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error message",
  "error": {
    "code": "ERROR_CODE",
    "details": { ... }
  }
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

## HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Request thành công |
| 201 | Created | Resource tạo thành công |
| 204 | No Content | Delete thành công |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Authentication failed |
| 403 | Forbidden | Authorization failed |
| 404 | Not Found | Resource không tồn tại |
| 409 | Conflict | Resource conflict |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

## API Categories

### 1. Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/sign-up` | Đăng ký người dùng mới |
| POST | `/auth/sign-in` | Đăng nhập |
| POST | `/auth/refresh` | Làm mới access token |
| POST | `/auth/logout` | Đăng xuất |
| GET | `/auth/csrf-token` | Lấy CSRF token |
| GET | `/auth/google` | Bắt đầu Google OAuth |
| GET | `/auth/google/callback` | Xử lý OAuth callback |
| POST | `/auth/password-reset/request` | Yêu cầu reset password |
| POST | `/auth/password-reset/confirm` | Xác nhận reset password |
| POST | `/auth/email-verification/request` | Yêu cầu xác minh email |
| POST | `/auth/email-verification/confirm` | Xác minh email |

**Chi tiết:** Xem [Authentication API](../03-CHUC-NANG/authentication.md)

### 2. Users

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users` | Danh sách users | Admin |
| POST | `/users` | Tạo user mới | Admin |
| GET | `/users/me` | Profile hiện tại | User |
| GET | `/users/:id` | Chi tiết user | Admin/Owner |
| PATCH | `/users/:id` | Cập nhật user | Admin/Owner |
| DELETE | `/users/:id` | Xóa user | Admin |
| POST | `/users/student-cards` | Upload student card | Admin |

**Chi tiết:** Xem [User Management](../03-CHUC-NANG/user-management.md)

### 3. User Roles

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/user-roles` | Danh sách roles | Admin |
| POST | `/user-roles` | Tạo role mới | Admin |
| GET | `/user-roles/:id` | Chi tiết role | Admin |
| PATCH | `/user-roles/:id` | Cập nhật role | Admin |
| DELETE | `/user-roles/:id` | Xóa role | Admin |

### 4. Topics (Feature Flag)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/topics` | Danh sách topics | Auth |
| POST | `/topics` | Tạo topic mới | Auth |
| GET | `/topics/:id` | Chi tiết topic | Auth |
| PATCH | `/topics/:id` | Cập nhật topic | Auth |
| DELETE | `/topics/:id` | Xóa topic | Auth |

**Feature Flag:** `ENABLE_TOPICS`

### 5. Collections (Feature Flag)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/collections` | Danh sách collections | Auth |
| POST | `/collections` | Tạo collection mới | Auth |
| GET | `/collections/:id` | Chi tiết collection | Auth |
| PATCH | `/collections/:id` | Cập nhật collection | Auth |
| DELETE | `/collections/:id` | Xóa collection | Auth |

**Feature Flag:** `ENABLE_COLLECTIONS`

### 6. Flash Cards (Feature Flag)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/flash-cards` | Danh sách flash cards | Auth |
| POST | `/flash-cards` | Tạo flash card mới | Auth |
| GET | `/flash-cards/:id` | Chi tiết flash card | Auth |
| PATCH | `/flash-cards/:id` | Cập nhật flash card | Auth |
| DELETE | `/flash-cards/:id` | Xóa flash card | Auth |

**Feature Flag:** `ENABLE_FLASH_CARDS`

### 7. Flash Cards State (Feature Flag)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/flash-cards-state` | Danh sách cards | Auth |
| POST | `/flash-cards-state` | Tạo draft mới | Auth |
| GET | `/flash-cards-state/:id` | Chi tiết card | Auth |
| PATCH | `/flash-cards-state/:id` | Cập nhật draft | Auth |
| POST | `/flash-cards-state/:id/submit` | Gửi để review | Auth |
| POST | `/flash-cards-state/:id/approve` | Phê duyệt | Auth |
| POST | `/flash-cards-state/:id/reject` | Từ chối | Auth |
| POST | `/flash-cards-state/:id/publish` | Xuất bản | Auth |
| GET | `/flash-cards-state/:id/transitions` | Lịch sử chuyển state | Auth |
| GET | `/flash-cards-state/:id/allowed-transitions` | State được phép | Auth |

**Feature Flag:** `ENABLE_FLASH_CARD_STATES`

### 8. Comments (Feature Flag)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/comments/posts/:postId` | Tạo comment gốc | Auth |
| POST | `/comments/:commentId/replies` | Tạo reply | Auth |
| GET | `/comments/posts/:postId/tree` | Lấy cây comment | Auth |
| GET | `/comments/:id/ancestors` | Lấy ancestors | Auth |
| GET | `/comments/:id/descendants` | Lấy descendants | Auth |
| PATCH | `/comments/:id` | Cập nhật comment | Auth |
| DELETE | `/comments/:id` | Xóa comment | Auth |

**Feature Flag:** `ENABLE_COMMENTS`

### 9. Check-in (Feature Flag)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/checkin` | Check-in hằng ngày | Auth |
| GET | `/checkin/history` | Lịch sử check-in | Auth |
| GET | `/checkin/stats` | Thống kê | Auth |
| GET | `/checkin/status` | Trạng thái hôm nay | Auth |

**Feature Flag:** `ENABLE_CHECKIN`

### 10. Media

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/media/upload` | Upload file | Auth |
| GET | `/media/:id` | Metadata file | Auth |
| GET | `/media/:id/download` | Download URL | Auth |
| DELETE | `/media/:id` | Xóa file | Auth |

**Cấu hình:** `ENABLE_S3=true`

### 11. Queue

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/queues/:name/status` | Thống kê queue | Admin |
| GET | `/queues/:name/jobs/:jobId` | Chi tiết job | Admin |

### 12. Audit

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/audit/events` | Lọc audit events | Admin |
| GET | `/audit/user/:userId` | Audit theo user | Admin |
| GET | `/audit/resource/:resourceType/:resourceId` | Audit theo resource | Admin |

### 13. Health & Metrics

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Welcome message | Public |
| GET | `/health` | Liveness check | Public |
| GET | `/health/live` | Liveness check | Public |
| GET | `/health/ready` | Readiness check | Public |
| GET | `/metrics` | Prometheus metrics | Private |

**Feature Flag:** `ENABLE_METRICS`

## Rate Limiting

- Auth endpoints: 10 requests/minute
- Public endpoints: 100 requests/minute
- Authenticated endpoints: 1000 requests/minute

## Pagination

Query parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Items per page (max 100) |
| `sort` | string | created_at | Sort field |
| `order` | string | DESC | Sort order (ASC/DESC) |

## Filtering

Common filter parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search in text fields |
| `filter[field]` | any | Filter by specific field |

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `AUTH_FAILED` | 401 | Authentication failed |
| `TOKEN_EXPIRED` | 401 | Token expired |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 422 | Input validation failed |
| `CONFLICT` | 409 | Resource conflict |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Internal server error |

## Swagger UI

Khi `SWAGGER_ENABLED=true`:

- **Swagger UI**: `/api-docs`
- **OpenAPI JSON**: `/api-docs-json`

**Authentication:** Basic Auth với `SWAGGER_USERNAME` và `SWAGGER_PASSWORD`

## Postman Collection

Sinh collection từ OpenAPI:

```bash
npm run postman:generate
```

Files được tạo:
- `postman_collection.json`
- `postman_environment.json`

**Chi tiết:** Xem [Swagger & Postman](swagger-postman.md)

## Tài liệu liên quan

- [API Reference](api-reference.md)
- [Response Contract](response-contract.md)
- [Swagger & Postman](swagger-postman.md)
- [Authentication](../03-CHUC-NANG/authentication.md)
