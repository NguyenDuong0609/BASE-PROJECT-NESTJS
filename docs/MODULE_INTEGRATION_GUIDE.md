# Hướng dẫn tích hợp module mới

Tài liệu này mô tả những chức năng nền tảng tự áp dụng cho module mới, những gì
module cần tự triển khai và cách Docker xác định container API đã sẵn sàng.

## Tích hợp nền tảng hiện có

Các thành phần dưới đây được đăng ký ở cấp ứng dụng. Khi module được import vào
`AppModule`, controller HTTP thông thường sẽ nhận các chức năng tương ứng mà
không cần đăng ký lại interceptor hoặc logger trong module đó.

| Chức năng           | Tự động áp dụng                                                                                                                                                  | Phần module cần tự làm                                                                                                                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API response        | `ResponseInterceptor` bọc giá trị trả về vào envelope chung; `ApiExceptionFilter` chuẩn hóa lỗi; `ValidationPipe` kiểm tra DTO.                                  | Trả dữ liệu bình thường hoặc ném NestJS HTTP exception/`ApiException`. Đăng ký mã message riêng bằng `@ApiSuccessMessage` nếu cần. Handler dùng `@Res()` để tự gửi response nằm ngoài envelope tự động. |
| Request log         | `nestjs-pino` ghi access log HTTP, tạo request ID do server quản lý và trả qua `x-request-id`; request ID có trong log. Health endpoint bị bỏ qua để giảm noise. | Ghi log sự kiện nghiệp vụ quan trọng một cách tường minh; không log mật khẩu, token hoặc payload nhạy cảm. Dùng `PinoLogger` với structured fields hoặc Nest `Logger` đã được chuyển qua Pino.          |
| HTTP metrics        | `MetricsInterceptor` ghi số request và thời lượng theo method, route và status cho HTTP handler.                                                                 | Không cần code thêm cho HTTP metrics cơ bản. Metrics nghiệp vụ riêng (ví dụ số giao dịch hoàn tất) chưa được tự thu thập; phải bổ sung instrumentation phù hợp trước khi dùng.                          |
| Audit log           | Request access log và pgAudit SQL được thu ở cấp ứng dụng/database; Alloy chuyển log service `api` và `postgres_db` tới Loki. | Application audit event không tự sinh: import `AuditLogModule`, inject `AuditLogService`, rồi gọi `recordEvent()` sau thao tác cần audit. Xem [Audit Guide](AUDIT_GUIDE.md) để bật dashboard, ghi event và lọc theo module. |
| Distributed tracing | Chưa được tích hợp OpenTelemetry; `requestId` chỉ nối các log của một request, không phải trace/span phân tán.                                                   | Nếu cần tracing, dự án phải cài SDK/exporter, khởi tạo instrumentation trước Nest bootstrap, cấu hình collector/backend và instrument các client cần theo dõi như HTTP/DB.                              |

`GET /metrics` chỉ được expose khi `ENABLE_METRICS=true`. Endpoint xuất Prometheus
text từ registry trong process; mỗi replica có registry riêng nên scraper cần lấy
dữ liệu từ từng instance. Metrics HTTP cơ bản có sẵn ở cấp ứng dụng; cache
operations được đếm theo namespace và outcome (`hit`, `miss`, `bypass`, `error`).
Queue metrics phản ánh số waiting/active/completed/failed/delayed tại thời điểm
scrape. Đọc queue metrics tạo ba lệnh truy vấn Redis cho mỗi lần scrape. Custom
business metrics khác chưa có API chung trong base.

Rate limiting toàn cục dùng Redis storage để chia sẻ bộ đếm qua nhiều replicas.
Redis là dependency bắt buộc cho request throttling; nếu Redis không khả dụng API
trả `503` thay vì âm thầm bỏ qua giới hạn. Khi chạy sau reverse proxy, chỉ cấu
hình trust proxy cho đúng số hop/địa chỉ proxy tin cậy để không cho client giả
mạo IP.

Cookie-authenticated clients phải lấy CSRF token qua `GET /auth/csrf-token`, giữ
cookie CSRF và gửi cùng giá trị trong `x-csrf-token` cho request thay đổi dữ
liệu. Guard kiểm tra cả Origin theo `CORS_ORIGINS` hoặc cùng host. Bearer-only
requests không yêu cầu CSRF token.

Ở các module đang có, API response, request log và HTTP metrics đã được wiring ở
cấp `AppModule`/`MetricsModule`, nên controller của các module đã đăng ký đều
được áp dụng. Application audit event vẫn cần được gọi tường minh; dashboard
Grafana tự nhận event mới qua Pino/Loki sau khi module ghi event theo chuẩn.
Xem [Audit Guide](AUDIT_GUIDE.md) để bật dashboard sau deploy và tích hợp module
mới. Chưa có OpenTelemetry tracing.

Application cache hiện mới được tích hợp làm ví dụ trong Flash Card; các module
domain cũ khác chưa tự được cache và cần chọn query phù hợp rồi dùng
`AppCacheService` như hướng dẫn dưới đây.

## Application cache

`AppCacheService` và `AppCacheKeyBuilder` nằm trong
`src/modules/shared/base/cache` để các domain module dùng chung. `AppCacheModule`
được đăng ký tại `AppModule` và export provider global. `AppCacheService` là
cache-aside dùng Redis hiện có. Redis vẫn là backend cho
BullMQ; cache dùng key prefix riêng
`<APP_CACHE_PREFIX>:app-cache:v1` (mặc định `nestjs-base`) và chỉ ghi các
payload JSON, không truy cập key queue của BullMQ. Nếu nhiều ứng dụng dùng chung
Redis database, đặt `APP_CACHE_PREFIX` khác nhau cho từng ứng dụng. Cache được
thiết kế để là lớp tăng tốc tùy chọn: lỗi Redis được log có giới hạn tần suất và
request quay về loader/DB thay vì trả lỗi chỉ vì cache hỏng. Cache miss cùng key
được gộp cả khi Redis lỗi để tránh làm nhiều truy vấn DB trùng nhau trong cùng
process.

Flash Card minh họa hai trường hợp thường dùng:

- `GET /flash-cards`: cache danh sách theo user ID và role. Người dùng thường
  chỉ thấy thẻ công khai cùng thẻ của chính họ; admin có danh sách khác. Các
  cache key không dùng chung giữa user/role, tránh trả nhầm dữ liệu cá nhân.
- `GET /flash-cards/:id`: cache chi tiết theo card ID, user ID và role. Loader
  vẫn kiểm tra tồn tại và quyền truy cập trước khi cache dữ liệu hợp lệ.
- `AppCacheKeyBuilder` nhận object dimensions gồm route, params, scope và
  query/filter; chuẩn hóa thứ tự key lồng nhau rồi hash thành key cố định. Vì
  vậy `id`, user, role, pagination và mọi filter ảnh hưởng kết quả đều phải có
  trong dimensions. Hai filter khác nhau tạo key khác nhau; object có thứ tự
  thuộc tính khác nhau nhưng cùng giá trị tạo cùng key.
- Cache TTL 30 giây, cộng tối đa 10% jitter để giảm nhiều key hết hạn cùng lúc.
  Payload được chuyển qua `instanceToPlain` trước khi lưu, nên thuộc tính
  `@Exclude` như password/token không được đưa vào cache.

Khi tạo/cập nhật/xóa Flash Card thành công, service tăng version namespace
`flash-cards`. Key mới dùng version mới nên dữ liệu cũ không còn được đọc; không
cần `KEYS`/`SCAN` hoặc xóa đồng bộ hàng loạt. Key cũ tự hết hạn trong tối đa
khoảng 33 giây. Cache miss được gộp trong cùng process và dùng Redis lock ngắn
để hạn chế nhiều instance cùng nạp một key; nếu lock holder chậm quá thời gian
chờ, request vẫn tiếp tục bằng DB để tránh chờ vô hạn.

### Dùng cache trong module mới

Import `AppCacheModule` (module đã đăng ký global trong `AppModule`), inject
`AppCacheService`, và sử dụng namespace riêng cho domain. Luôn đưa actor,
tenant, locale và mọi tham số ảnh hưởng kết quả vào cache key; không cache
response đã phân quyền theo một key dùng chung.

```ts
const result = await this.cache.getOrSet(
	'orders',
	AppCacheKeyBuilder.build({
		route: '/orders',
		scope: { userId: user.id, tenantId: user.tenantId },
		query: { status, page, pageSize, filters },
	}),
	30_000,
	() => this.ordersRepository.findForUser(user.id, status),
	(value) => instanceToPlain(value),
);
```

Với route động, đưa route mẫu và param vào dimensions, ví dụ
`{ route: '/orders/:id', params: { id }, scope: { userId } }`. Với filter, đưa
toàn bộ giá trị ảnh hưởng kết quả vào `query`; không ghép chuỗi query thủ công
vì dễ bỏ sót dimension hoặc tạo key khác nhau do thứ tự tham số. Object key
order được chuẩn hóa; `undefined` trong object được bỏ qua (như option không
truyền), còn `undefined` trong array, circular reference, số không hữu hạn và
kiểu không JSON-compatible sẽ bị từ chối thay vì tạo collision âm thầm. `Date`
được chuẩn hóa thành ISO string.

Sau khi ghi DB thành công, gọi `await this.cache.invalidate('orders')` để đổi
generation và làm các entry namespace đó không còn được đọc. Gọi invalidation
sau transaction commit; nếu transaction rollback thì không invalidation cần
thiết. Nếu một thao tác ở module khác sửa dữ liệu được nhúng trong cache
(ví dụ sửa Topic làm thay đổi quan hệ trong cache Flash Card), module đó cũng
phải invalidation namespace liên quan hoặc không cache quan hệ bị sửa.

Không cache mặc định mọi GET: ưu tiên dữ liệu đọc nhiều/ít thay đổi và tốn DB,
để tránh cache amplification, memory/key growth và tăng độ phức tạp của
invalidation. Không cache mutation, authentication/session responses, dữ liệu
nhạy cảm, kết quả phụ thuộc quyền nếu key không chứa đầy đủ scope, hoặc query có
cardinality cao. Dùng TTL ngắn làm giới hạn stale cuối cùng; nếu Redis không
thể bump generation sau một mutation, request ghi vẫn thành công (tránh báo lỗi
giả sau khi DB đã commit), lỗi được log và cache cũ hết hạn theo TTL. Vì vậy đây
là eventual consistency có stale bound, không phải cache có consistency tuyệt
đối.

## Tạo và đăng ký module

1. Tạo module, controller, service, DTO và entity theo cấu trúc của các module
   hiện có. Với entity TypeORM, đăng ký qua `TypeOrmModule.forFeature([...])`
   trong module.
2. Import module mới vào `imports` trong `src/app.module.ts`. Các interceptor,
   filter, validation pipe, logger và HTTP metrics toàn cục sẽ áp dụng cho các
   route mới khi ứng dụng khởi chạy. Cache cần được inject và gọi tường minh
   tại các query phù hợp; cache không tự áp dụng lên mọi endpoint.
3. Export service/token từ module nếu module khác cần inject chúng; module mới
   không nhìn thấy provider private của module khác chỉ vì cả hai cùng nằm
   trong `AppModule`.
4. Đăng ký feature flag/guard, quyền truy cập, Swagger metadata, migration và
   test theo nhu cầu của feature. Những phần này không được tự sinh khi thêm
   module.
5. Kiểm tra response success/error, access log có request ID, HTTP metrics
   (khi được bật), authorization và migration bằng test phù hợp.

Các endpoint danh sách nên dùng `ParsePaginationPipe` ở
`src/modules/shared/base/pipes`: mặc định offset/limit, giới hạn `limit` tối đa
100 và từ chối giá trị âm, thập phân hoặc quá lớn. Dùng cursor pagination thay
offset cho bảng lớn hoặc luồng dữ liệu tăng nhanh.

Danh sách comment tree được phân trang theo comment gốc; mỗi gốc trong trang vẫn
được trả cùng các hậu duệ của nó. Truy vấn closure được batch thay vì chạy một
query cho từng comment. Với một nhánh hội thoại cực lớn, nên bổ sung giới hạn
theo độ sâu/kích thước hoặc endpoint flat cursor-paginated trước khi sử dụng ở
quy mô lớn.

Ví dụ ghi audit event nghiệp vụ:

```ts
import { AuditLogService } from '../../observability/audit-log.service';

constructor(private readonly auditLog: AuditLogService) {}

async createOrder(order: Order, actorUserId: string) {
	const created = await this.ordersRepository.save(order);
	await this.auditLog.recordEvent({
		eventType: 'business',
		action: 'ORDER_CREATED',
		actorUserId,
		subjectUserId: created.userId,
		resourceType: 'order',
		resourceId: created.id,
		metadata: { itemCount: created.items.length },
	});
	return created;
}
```

Module cần import `AuditLogModule` để inject `AuditLogService`. Dùng Pino/Nest
`Logger` cho log kỹ thuật; audit event không thay thế log debug và không tự sinh
chỉ vì request đã có access log. Cách lọc event trên dashboard/API xem trong
[Audit Guide](AUDIT_GUIDE.md).

## Container health trong Docker Compose

Healthcheck là lệnh do Docker chạy bên trong container. Nó gọi endpoint HTTP của
ứng dụng, rồi Docker cập nhật trạng thái container thành `starting`, `healthy`
hoặc `unhealthy`. Đây không phải một endpoint hay một cơ chế restart riêng.

Development và production Compose dùng:

- `GET /health/live` để kiểm tra process API còn phản hồi.
- `GET /health/ready` để kiểm tra API cùng PostgreSQL và Redis; HTTP `503` khiến
  healthcheck thất bại. Docker healthcheck của API gọi endpoint readiness này.
- PostgreSQL có `pg_isready`; Redis có `redis-cli ping`. API chờ hai dependency
  healthy trước khi khởi động ở development; production còn chạy migration job
  trước API. Development cho phép 180 giây khởi động để TypeScript watch compile
  hoàn tất; production dùng 40 giây vì chạy JavaScript đã build.

Trong Docker Compose, xem trạng thái và lịch sử probe:

```powershell
docker compose --env-file .env.dev -f docker-compose.dev.yml ps
$api = docker compose --env-file .env.dev -f docker-compose.dev.yml ps -q api
docker inspect --format='{{json .State.Health}}' $api
docker compose --env-file .env.dev -f docker-compose.dev.yml logs api
```

Healthcheck giúp phát hiện dependency/API chưa sẵn sàng và cho
`depends_on: condition: service_healthy` điều phối thứ tự khởi động. Nó không
thay thế monitoring/alerting và Docker Compose không tự restart container chỉ vì
trạng thái chuyển thành `unhealthy`; restart policy xử lý việc process/container
thoát, không phải health status đơn lẻ. Nền tảng triển khai khác có thể dùng
health probe riêng thay cho Compose healthcheck.
