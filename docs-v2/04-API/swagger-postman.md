# Swagger & Postman

Hướng dẫn sử dụng Swagger UI và Postman để test API.

## Swagger UI

### Bật Swagger

Trong `.env.dev`:

```env
SWAGGER_ENABLED=true
SWAGGER_USERNAME=local-docs
SWAGGER_PASSWORD=replace-with-at-least-16-characters
```

### Truy cập Swagger

- **URL**: `http://localhost:3000/api-docs`
- **Authentication**: Basic Auth
  - Username: `local-docs`
  - Password: (giá trị `SWAGGER_PASSWORD`)

### Sử dụng Swagger UI

1. **Mở Swagger UI**
   ```
   http://localhost:3000/api-docs
   ```

2. **Đăng nhập**
   - Click "Authorize" button
   - Nhập username/password
   - Click "Authorize"

3. **Test endpoint**
   - Chọn endpoint
   - Click "Try it out"
   - Nh nhập parameters/body
   - Click "Execute"
   - Xem response

### Swagger Decorators

Trong controller:

```typescript
@ApiTags('Users')
@Controller('users')
export class UsersController {
  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Success' })
  async findAll() {
    return this.usersService.findAll();
  }
}
```

Trong DTO:

```typescript
export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8)
  password: string;
}
```

## Postman Collection

### Generate Collection

```bash
# Set environment variables
$env:OPENAPI_URL = "http://localhost:3000/api-docs-json"
$env:SWAGGER_USERNAME = "local-docs"
$env:SWAGGER_PASSWORD = "replace-with-at-least-16-characters"

# Generate collection
npm run postman:generate
```

Files được tạo:
- `postman_collection.json` - Collection với tất cả endpoints
- `postman_environment.json` - Environment variables

### Import vào Postman

1. **Mở Postman**
2. **Import collection**
   - Click "Import"
   - Chọn `postman_collection.json`
   - Click "Import"

3. **Import environment**
   - Click "Import"
   - Chọn `postman_environment.json`
   - Click "Import"

4. **Select environment**
   - Click environment dropdown (top-right)
   - Chọn "NestJS Base API - Local"

### Environment Variables

Collection sử dụng các biến:

| Variable | Giá trị mặc định | Mô tả |
|----------|----------------|--------|
| `base_url` | `http://localhost:3000` | API base URL |
| `frontend_origin` | `http://localhost:4200` | Frontend URL |
| `access_token` | (auto-set) | JWT access token |
| `refresh_token` | (auto-set) | JWT refresh token |
| `user_id` | (auto-set) | ID user hiện tại |
| `media_id` | (auto-set) | ID media file |
| `post_id` | (auto-set) | ID post/comment |

### Thứ tự thực hiện gợi ý

1. **Health Check**
   - `GET /health/live`
   - `GET /health/ready`

2. **Authentication**
   - `POST /auth/sign-up`
   - `POST /auth/sign-in`
   - Token tự động lưu vào environment

3. **User Operations**
   - `GET /users/me`
   - `PATCH /users/me`

4. **Domain Features** (nếu đã bật)
   - `POST /topics`
   - `POST /collections`
   - `POST /flash-cards`
   - `POST /checkin`

5. **Admin Operations** (với admin token)
   - `GET /users`
   - `POST /user-roles`
   - `GET /audit/events`

### Script tự động

Collection có script tự động:

**Sau sign-in/sign-up:**
```javascript
if (pm.response.code === 200 || pm.response.code === 201) {
    const response = pm.response.json();
    pm.environment.set('access_token', response.access_token);
    pm.environment.set('refresh_token', response.refresh_token);
    if (response.user) {
        pm.environment.set('user_id', response.user.id);
    }
}
```

**Sau tạo resource:**
```javascript
if (pm.response.code === 201) {
    const response = pm.response.json();
    if (response.data && response.data.id) {
        pm.environment.set('resource_id', response.data.id);
    }
}
```

### Authentication trong Postman

**Option 1: Bearer Token**

1. Mở request
2. Tab "Authorization"
3. Type: "Bearer Token"
4. Token: `{{access_token}}`

**Option 2: Header thủ công**

1. Tab "Headers"
2. Add header:
   - Key: `Authorization`
   - Value: `Bearer {{access_token}}`

### Test một endpoint cụ thể

Nếu cần test endpoint cụ thể với ID:

1. Update biến trong environment:
   ```
   user_id = <specific-uuid>
   ```

2. Hoặc dùng inline variable:
   ```
   {{user_id}} → <specific-uuid>
   ```

### Cookie-based Auth

Nếu dùng cookie auth:

1. **Lấy CSRF token**
   - `GET /auth/csrf-token`
   - Cookie và token tự động lưu

2. **Gửi request**
   - Header `x-csrf-token`: `{{csrfToken}}`
   - Cookie được gửi tự động

### Troubleshooting

#### 401 Unauthorized

- Kiểm tra `access_token` trong environment
- Token có thể hết hạn → gọi `/auth/refresh`
- Đảm bảo header `Authorization` đúng format

#### 403 Forbidden

- User không có quyền truy cập endpoint
- Check role của user
- Dùng admin token cho endpoints admin

#### 404 Not Found

- Endpoint bị tắt bởi feature flag
- Kiểm tra `.env.dev` các flag `ENABLE_*`
- Resource ID không tồn tại

#### Collection không import được

- Kiểm tra file JSON format
- Đảm bảo file không bị corrupted
- Thử import từng file riêng

#### Variables không set

- Kiểm tra test script trong response
- Đảm bảo response format đúng
- Xem console Postman cho lỗi

## Re-generate Collection

Khi thay đổi API:

1. Thay đổi code (controller, DTO, Swagger decorators)
2. Restart API
3. Re-generate collection:
   ```bash
   npm run postman:generate
   ```
4. Import lại vào Postman

## Best Practices

### Testing Workflow

1. **Smoke test** - Test các endpoint cơ bản
2. **Integration test** - Test luồng hoàn chỉnh
3. **Negative test** - Test lỗi và edge cases
4. **Performance test** - Test với nhiều request

### Collection Organization

- Group endpoints theo module
- Sử dụng folders để tổ chức
- Add description cho từng request
- Sử dụng saved examples

### Environment Management

- Tạo environment riêng cho mỗi môi trường
- Local, Staging, Production
- Không commit secrets
- Sử dụng Postman Vault cho secrets

## Automation

### Newman CLI

Test collection từ command line:

```bash
npm install -g newman

# Run collection
newman run postman_collection.json \
  -e postman_environment.json \
  --bail

# With reporters
newman run postman_collection.json \
  -e postman_environment.json \
  -r cli,json \
  --reporter-json-export results.json
```

### CI/CD Integration

Add vào pipeline:

```yaml
test:api:
  script:
    - npm install -g newman
    - newman run postman_collection.json -e postman_environment.json
```

## Tài liệu liên quan

- [API Reference](api-reference.md)
- [Response Contract](response-contract.md)
- [Authentication](../03-CHUC-NANG/authentication.md)
