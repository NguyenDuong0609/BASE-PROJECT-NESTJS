# Auditing & Security Logs

Tài liệu về hệ thống kiểm toán (Auditing) bao gồm Application Audit Events, Cơ chế lưu trữ PostgreSQL, pgAudit, và trực quan hóa qua Grafana.

---

## 1. Tổng quan Kiến trúc Auditing (3 Tầng Kiểm Toán)

Hệ thống triển khai mô hình kiểm toán toàn diện 3 tầng (3-tier Auditing):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Kiến Trúc Kiểm Toán                             │
├──────────────────────┬──────────────────────────┬───────────────────────────┤
│ 1. API Request Audit │ 2. Application Audit     │ 3. Database Audit (pgAudit)│
├──────────────────────┼──────────────────────────┼───────────────────────────┤
│ HTTP Access & Trace  │ Business & Security Ops  │ SQL DDL/DML Engine Logs   │
│ - Request ID & IP    │ - User Lifecycle         │ - Schema mutations        │
│ - Method & Route     │ - Role / Permission chg  │ - Table inserts/updates   │
│ - Status Code        │ - Auth login/logout      │ - Direct DB connections   │
│ - Response time (ms) │ - Lưu DB + Emit Loki     │ - PostgreSQL Extension    │
└──────────────────────┴──────────────────────────┴───────────────────────────┘
```

1. **Tầng 1: API Request Audit Logs (HTTP Access Logs)**:
   - Ghi nhận mọi HTTP request đi vào hệ thống qua `nestjs-pino`: Method, URL, Status Code, Response Time, Client IP, Request ID, User ID, User Agent.
   - Lưu trữ tự động tại Loki dưới nhãn `{service="api", context="HTTP"}`.
2. **Tầng 2: Application Audit Events (Nghiệp vụ ứng dụng & An ninh)**:
   - Bản ghi kiểm toán do `AuditLogService` quản lý: lưu trữ bảng PostgreSQL `audit_events` và đồng thời emit log có cấu trúc `{event="audit_event"}`.
3. **Tầng 3: Database Engine Audit (PostgreSQL pgAudit)**:
   - Giám sát toàn bộ câu lệnh SQL DDL và DML cấp cơ sở dữ liệu qua extension pgAudit.

---

## 2. Thực thể AuditEvent (`audit-event.entity.ts`)

Định nghĩa bảng `audit_events` tại [src/observability/audit-event.entity.ts](file:///d:/Project_AI/Project_Base_NestJS_V3/src/observability/audit-event.entity.ts):

| Cột | Kiểu | Mô tả |
|---|---|---|
| `id` | `UUID` (Primary Key) | Mã định danh duy nhất của sự kiện kiểm toán |
| `event_type` | `varchar(20)` | Phân loại: `'security'` hoặc `'business'` |
| `action` | `varchar(80)` | Hành động cụ thể (ví dụ: `AUTH_SIGN_IN`, `USER_DELETED`) |
| `actor_user_id` | `UUID`, nullable | User thực hiện hành động |
| `subject_user_id` | `UUID`, nullable | User là đối tượng bị tác động |
| `resource_type` | `varchar(80)`, nullable | Loại thực thể (ví dụ: `User`, `Role`, `FlashCard`) |
| `resource_id` | `varchar(255)`, nullable | Khóa chính của thực thể bị tác động |
| `metadata` | `JSONB` | Dữ liệu ngữ cảnh đi kèm (tối đa 20 trường, không chứa dữ liệu nhạy cảm) |
| `created_at` | `timestamp with time zone` | Thời điểm ghi nhận sự kiện |

### Chỉ mục phục vụ truy vấn tốc độ cao (Indexes)
- `IDX_audit_events_subject_created`: `(subject_user_id, created_at)`
- `IDX_audit_events_actor_created`: `(actor_user_id, created_at)`
- `IDX_audit_events_action_created`: `(action, created_at)`
- `IDX_audit_events_type_created`: `(event_type, created_at)`
- `IDX_audit_events_created_at`: `(created_at)`

---

## 3. AuditLogService

Cung cấp các hàm chuẩn tại [src/observability/audit-log.service.ts](file:///d:/Project_AI/Project_Base_NestJS_V3/src/observability/audit-log.service.ts):

### 3.1. Ghi nhận sự kiện kiểm toán
```typescript
await this.auditLogService.record(
  'AUTH_LOGIN_SUCCESS', // Action name (nếu bắt đầu bằng AUTH_ hoặc ACCOUNT_ sẽ tự động là 'security')
  user.id,              // subjectUserId
  user.id,              // actorUserId
  { ip: req.ip, userAgent: req.headers['user-agent'] }, // metadata
);
```

Hoặc sử dụng phương thức chi tiết `recordEvent`:
```typescript
await this.auditLogService.recordEvent({
  eventType: 'security',
  action: 'ROLE_ASSIGNED',
  actorUserId: adminUser.id,
  subjectUserId: targetUser.id,
  resourceType: 'Role',
  resourceId: roleId,
  metadata: { roleName: 'Admin' },
});
```

### 3.2. Quy tắc an toàn dữ liệu Metadata (Data Sanitization)
`AuditLogService` tự động chặn lỗi nếu metadata vi phạm:
1. Số lượng khóa tối đa: **20 keys**.
2. **Nghiêm cấm các khóa nhạy cảm**: Khóa không được chứa chuỗi: `password`, `token`, `secret`, `authorization`, `cookie`, `credential`, `email`, `phone`, `address`, `body`, `old_value`, `new_value`, `query`.
3. Kiểu giá trị hợp lệ: Chỉ chấp nhận `string` (<= 512 chars), `number`, `boolean`, hoặc `null`.

### 3.3. Chính sách lưu trữ & Dọn dẹp tự động (Retention Policy)
- Cấu hình qua biến môi trường: `AUDIT_RETENTION_DAYS` (ví dụ: `90`).
- Nếu `AUDIT_RETENTION_DAYS > 0`, service tự động chạy cron job mỗi 24 giờ xóa theo batch 5,000 bản ghi các sự kiện cũ hơn thời hạn quy định.

---

## 4. Tích hợp pgAudit (PostgreSQL Extension)

Trong môi trường Docker (cả Dev và Prod):
1. **Dockerfile**: `docker/postgres/Dockerfile` build từ image PostgreSQL chính thức và cài đặt gói `postgresql-15-pgaudit`.
2. **Kích hoạt qua Docker Compose**:
   ```yaml
   command:
     - postgres
     - -c
     - shared_preload_libraries=pgaudit
     - -c
     - pgaudit.log=write,ddl,role
     - -c
     - pgaudit.log_parameter=off
     - -c
     - pgaudit.log_relation=on
     - -c
     - log_line_prefix=%m [%p] user=%u,db=%d,app=%a,client=%h
   ```
3. Nhật ký pgAudit xuất hiện trực tiếp trong container stdout của `postgres_db` và được Grafana Alloy thu thập tự động.

---

## 5. Pre-configured Grafana Dashboard

Dự án tích hợp sẵn dashboard [nestjs-audit-logs.json](file:///d:/Project_AI/Project_Base_NestJS_V3/observability/grafana/dashboards/nestjs-audit-logs.json) trong Grafana:

### Cấu trúc Dashboard (4 Khối Kiểm Toán):

#### 📌 Khối Tổng quan (Overview Stats)
- **Total API Requests**: Tổng số request trong 1 giờ qua (`sum(count_over_time({service="api", context="HTTP"} [1h]))`).
- **API Errors (4xx/5xx)**: Số lượng request lỗi client hoặc server.
- **Application Audit Events**: Tổng số sự kiện nghiệp vụ được ghi nhận.
- **Database pgAudit Logs**: Tổng số câu lệnh DDL/DML đã ghi nhận ở tầng PostgreSQL.

#### 🌐 Khối 1: API Request Audit Logs (HTTP Access)
- **All API Request Logs (Real-time Stream)**: `{service="api", context="HTTP"} | json`
  - Hiển thị: Timestamp, HTTP Method (`GET`, `POST`,...), URL path, Status code (`200`, `401`, `500`), Response time (ms), Request ID, Remote IP, User Agent.
- **API Request Rate by Status Code**: Biểu đồ phân bổ tỷ lệ request theo mã trạng thái HTTP theo thời gian.
- **API Request Errors & Warnings**: Lọc riêng các request bị lỗi (`res_statusCode >= 400`).

#### 📋 Khối 2: Application Audit Events (Nghiệp vụ)
- **Application Audit Events**: `{service="api"} |= "audit_event" | json | event = "audit_event"`
  - Hiển thị: `action`, `eventType`, `actorUserId`, `subjectUserId`, `resourceType`, `resourceId`.
- **Audit Events by Action**: Biểu đồ tần suất hành động (`USER_CREATED`, `AUTH_LOGIN`,...).
- **Audit Events by Type**: Biểu đồ tròn tỷ lệ giữa `security` và `business`.

#### 🔐 Khối 3: Security Audit Events (Xác thực & Bảo mật)
- **Security Events Stream**: `{service="api"} |= "audit_event" | json | event = "audit_event" | eventType = "security"`
  - Giám sát các sự kiện nhạy cảm: `AUTH_*`, `ACCOUNT_*`, đổi mật khẩu, phân quyền.

#### 🐘 Khối 4: Database Audit Logs (PostgreSQL pgAudit)
- **PostgreSQL pgAudit SQL Logs**: `{service="postgres_db"} |= "AUDIT"`
  - Chi tiết từng câu lệnh SQL DDL và DML cấp cơ sở dữ liệu.
