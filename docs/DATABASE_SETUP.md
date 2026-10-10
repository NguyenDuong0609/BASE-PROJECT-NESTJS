# Thiết lập database và migration

Application dùng PostgreSQL 15+ và TypeORM. `synchronize` tắt; schema được thay
đổi thông qua các migration đã review. Không dùng schema synchronization để phát
hành production.

## Local setup

1. Tạo `.env.dev` từ `.env.example`; đặt database credentials.
2. Khởi động PostgreSQL/Redis:

```powershell
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d postgres_db redis
```

3. Compose expose PostgreSQL trên `localhost:5433` (container port `5432`), còn
   Redis trên `localhost:6379`. Migration CLI trên host đọc `.env.dev` khi
   `NODE_ENV=development`.
4. Chạy và kiểm tra migrations:

```powershell
$env:NODE_ENV = 'development'
npm run migration:show
npm run migration:run
```

Mỗi migration mới phải chạy thành công trước khi app/e2e suite dùng database mới.

## Thay đổi schema

1. Sửa entity và cập nhật tests/domain code.
2. Sinh migration:

```powershell
$env:NODE_ENV = 'development'
npm run migration:generate -- src/database/migrations/AddProductStatus
```

3. Review SQL TypeORM sinh ra, bổ sung xử lý dữ liệu/backfill và `down()` nếu rollback
   an toàn. Kiểm tra cả schema mới lẫn dữ liệu nâng cấp đại diện.
4. Chạy migration trên database throwaway/dev; xác nhận thứ tự và tính tương thích.
5. Commit migration cùng code thay đổi; không sửa/xóa migration đã được triển khai.

Lệnh hữu ích:

```powershell
$env:NODE_ENV = 'development'
npm run migration:run
npm run migration:show
npm run migration:revert
```

Chỉ revert migration local/test khi phù hợp. Production rollback cần quyết định phát
hành riêng; thường tạo migration tiến thêm an toàn hơn việc chạy `down()` sau khi đã
có traffic/dữ liệu mới.

## Runtime / production

- TypeORM được cấu hình `synchronize: false` và `autoLoadEntities: true`.
- Production image chứa JavaScript đã compile trong `dist`; Compose chạy service
  migrate one-shot bằng TypeORM CLI trên `dist/database/data-source.js`.
- API chỉ khởi động sau khi migrate hoàn tất thành công.
- `DB_POOL_SIZE`, `DB_CONNECTION_TIMEOUT_MS`, `DB_QUERY_TIMEOUT_MS` đặt giới hạn
  kết nối/timeouts; phải tính tổng pool trên tất cả replicas so với giới hạn database.
- Backup/restore procedure có trong [Operations Backup/Restore](OPERATIONS_BACKUP_RESTORE.md).

## Test và dữ liệu giả

Một số repository unit tests dùng `pg-mem`. E2E dùng `AppModule` thật nên cần
PostgreSQL/Redis và environment cấu hình phù hợp. Không chạy tests trên production
database. Không dùng `docker compose down -v` nếu cần giữ local database volumes.
