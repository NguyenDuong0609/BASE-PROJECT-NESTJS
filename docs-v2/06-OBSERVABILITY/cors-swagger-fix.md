# CORS Error Fix for Swagger UI

Khi test API trong Swagger UI gặp lỗi "Failed to fetch" với CORS error.

## Nguyên nhân

Swagger UI chạy trên `http://localhost:3317` (cùng port với API) nhưng CORS chỉ được cấu hình cho `http://localhost:4200` (frontend).

## Giải pháp

Đã cập nhật `.env.dev`:

```env
# Trước
CORS_ORIGINS=http://localhost:4200

# Sau
CORS_ORIGINS=http://localhost:4200,http://localhost:3317
```

## Cách áp dụng

### Option 1: Chạy local (được khuyến nghị cho dev)

```bash
# 1. Stop Docker API container
docker compose --env-file .env.dev -f docker-compose.dev.yml stop api

# 2. Chạy API local (vẫn dùng PostgreSQL và Redis từ Docker)
npm run start:dev
```

Sau đó:
- Swagger UI: http://localhost:3000/api-docs (hoặc port trong .env.dev)
- Login với username/password trong .env.dev

### Option 2: Chạy trong Docker

```bash
# Restart API container để load .env.dev mới
docker compose --env-file .env.dev -f docker-compose.dev.yml restart api

# Chờ 30-60 giây để API khởi động
curl http://localhost:3317/health/ready
```

## Nếu API container không khởi động được

Hiện tại API container đang gặp vấn đề compilation trong Docker. Khuyến nghị:

1. **Chạy local cho development**
   - PostgreSQL và Redis vẫn chạy trong Docker
   - API chạy local với `npm run start:dev`
   - Dễ debug và fix errors

2. **Kiểm tra logs nếu vẫn muốn chạy Docker**
   ```bash
   docker logs project_base_nestjs_v3-api-1 --tail 100
   ```

3. **Build local để xem errors**
   ```bash
   npm run build
   ```

## CORS Configuration Details

### main.ts
```typescript
const origins = config_service.get<string[]>('cors.origins') || [];
app.enableCors({
  origin: origins.length ? origins : false,
  credentials: origins.length > 0,
});
```

### configuration.config.ts
```typescript
cors: {
  origins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
}
```

## Các origins cần thêm cho development

```env
# Local development
CORS_ORIGINS=http://localhost:4200,http://localhost:3317,http://localhost:3000

# Nếu dùng port khác
CORS_ORIGINS=http://localhost:4200,http://localhost:3317,http://localhost:3000,http://localhost:PORT
```

## Testing sau khi fix

### 1. Test Swagger UI
- Mở http://localhost:3317/api-docs (hoặc port tương ứng)
- Login với credentials trong .env.dev
- Test một endpoint (ví dụ `/topics`)
- Không nên còn lỗi CORS

### 2. Test với curl
```bash
# Test health endpoint
curl http://localhost:3317/health/ready

# Test với origin header
curl -H "Origin: http://localhost:3317" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS http://localhost:3317/topics
```

### 3. Kiểm tra CORS headers
```bash
curl -I http://localhost:3317/topics
```

Expected headers:
```
Access-Control-Allow-Origin: http://localhost:3317
Access-Control-Allow-Credentials: true
```

## Production CORS

Trong production (.env.prod), chỉ nên allow origins thực sự cần thiết:

```env
# Production - chỉ frontend domain
CORS_ORIGINS=https://your-frontend-domain.com
```

Không nên use wildcard `*` vì:
- Vô hình hóa security
- Không thể gửi credentials (cookies, auth headers)
- Violate best practices

## Troubleshooting

### Vẫn gặp CORS error sau khi fix

1. **Kiểm tra .env.dev đã được load không**
   ```bash
   # Xem logs của API
   docker logs project_base_nestjs_v3-api-1 | grep "CORS"
   ```

2. **Restart API container**
   ```bash
   docker compose --env-file .env.dev -f docker-compose.dev.yml restart api
   ```

3. **Chạy local để test**
   ```bash
   npm run start:dev
   ```

### Swagger UI không load được

1. **Kiểm tra Swagger enabled**
   ```env
   SWAGGER_ENABLED=true
   ```

2. **Kiểm tra credentials**
   ```env
   SWAGGER_USERNAME=local-docs
   SWAGGER_PASSWORD=<strong-password>
   ```

3. **Access Swagger**
   - URL: http://localhost:3317/api-docs
   - Login với credentials trên

## Document liên quan

- <ref_file file="D:\Project_AI\Project_Base_NestJS_V3\docs-v2\01-BUILD-DEPLOY\local-development.md" />
- <ref_file file="D:\Project_AI\Project_Base_NestJS_V3\docs-v2\06-OBSERVABILITY\database-metrics-setup.md" />
