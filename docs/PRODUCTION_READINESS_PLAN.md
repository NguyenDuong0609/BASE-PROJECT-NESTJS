# Kế hoạch cải thiện mức độ sẵn sàng triển khai production

## Mục tiêu

Đưa code NestJS lên mức an toàn, ổn định và có hành vi production-appropriate để các
dự án có thể dùng làm application base. Plan này đánh giá code, dependency, validation,
auth, data access và tests; không đánh giá năng lực DevOps hay xác nhận một deployment
production cụ thể.

## Thứ tự ưu tiên

- **P0 — Chặn phát hành:** lỗ hổng xác thực/phân quyền, rò rỉ dữ liệu và các luồng chức
  năng production không hoạt động.
- **P1 — Năng lực application:** hành vi runtime, migration compatibility, tests và
  cấu hình mà code base cung cấp.
- **P2 — Gia cố application:** dependency, logging, queue behavior và tài liệu khởi tạo.

Staging, backup/restore, deployment, secrets provisioning, capacity và rollback thuộc
phạm vi nghiệm thu của từng dự án; chúng không phải tiêu chí để đánh giá bản thân source
code base.

## Tiến độ triển khai trên branch hiện tại

Đây là tiến độ mã nguồn và kiểm thử cục bộ, không thay thế việc nghiệm thu staging:

- Đã kiểm chứng production image/Compose smoke test sau khi nâng NestJS 12 với
  PostgreSQL/Redis cô lập; migration job thoát `0`, API container healthy, các
  endpoint root/liveness/readiness trả HTTP 200 và readiness trả `ready`. Google
  OAuth/S3 được tắt; stack, volumes và file env giả đã được dọn sau kiểm thử.
- Ở lần kiểm chứng trước: production build pass; full Jest **55/55 suites, 194/194
  tests**; lint **0 errors**; `npm audit` báo **0 vulnerabilities**. Trong phiên rà
  soát này, build/lint pass dưới Node `22.21.1`; Jest không nạp được ESM của NestJS 12.
  Thử lại với Node `24.8.0` cũng lỗi: Jest đang transform test sang CommonJS trong khi
  `@nestjs/common` là ESM. Node `24.8.0` vẫn thấp hơn engine yêu cầu `>=24.15.0`, nên
  cần sửa/xác nhận cấu hình Jest trên runtime được hỗ trợ trước khi khẳng định suite
  hiện tại pass; không xem lỗi Jest này là lỗi production build.
- Đã kiểm chứng production Docker Compose: migration job chạy thành công, PostgreSQL/
  Redis và API healthy, root/liveness/readiness/Prometheus metrics trả HTTP 200; student
  card upload stub trả `404` khi bị tắt. Stack, volumes, image và credentials tạm đã dọn.
- Đã nâng NestJS lên v12.1.2, các adapter/integration packages tương thích, TypeScript
  6, Jest 30 và Node.js 24; toàn bộ `npm audit` hiện có **0 vulnerabilities**.
- Đã kiểm chứng: migration bảo mật chạy trên PostgreSQL 16 với schema/data của
  migration cũ; user được giữ lại, plaintext password được hash, refresh token cũ bị
  thu hồi và enum role được mở rộng.
- Đã bổ sung response contract tập trung cho success/error/validation; format HTTP
  được kiểm tra bằng tests unit và request-level. Hợp đồng được mô tả tại
  `docs/API_RESPONSE_CONTRACT.md`.
- Đã thêm `API_ERROR_CATALOG` và `ApiException` để tái sử dụng error code, HTTP
  status và message; flash-card access/not-found đã dùng catalog thay vì lặp message.
- Message thành công theo endpoint được quản lý bởi `API_SUCCESS_CATALOG` và
  `@ApiSuccessMessage`; NestJS HTTP exception thông thường được ánh xạ status sang
  error code ổn định, đồng thời giữ message phù hợp.
- Các hạng mục staging/deploy/rollback, backup/restore, image scan, load test và
  credentials cho Google OAuth/S3/provider thật là nghiệm thu của dự án sử dụng base,
  không nằm trong phạm vi sửa application source.

## P0 — Chặn phát hành

### Xác thực và phân quyền

- [x] **P0.1 — Tôn trọng thời hạn access token.** Tắt cấu hình bỏ qua expiration tại
      `src/modules/auth/strategies/jwt-access-token.strategy.ts`; thêm test từ chối token
      hết hạn và token sai chữ ký; strategy kiểm tra HS256 và `ignoreExpiration: false`.
- [x] **P0.2 — Bảo vệ các endpoint user.** Yêu cầu access token và kiểm tra quyền sở
      hữu hoặc quyền admin cho đọc theo ID, cập nhật, tạo user và tải student-card tại
      `src/modules/users/users.controller.ts`. Chỉ cho phép endpoint đăng ký công khai
      qua luồng auth chuyên biệt; không dùng DTO admin làm DTO đăng ký. Có test chặn truy
      cập user khác; student-card là stub chưa hoàn thiện, mặc định bị tắt bởi
      `ENABLE_STUDENT_CARD_UPLOADS` và sẽ trả `501` nếu chủ động bật.
- [x] **P0.3 — Hash mật khẩu ở mọi đường tạo/cập nhật tài khoản.** Đảm bảo `UsersService`
      hoặc một lớp auth chuyên trách không bao giờ ghi plaintext; giữ tương thích với luồng
      đăng ký hiện tại. Thêm test xác nhận DB chỉ nhận password hash và không trả password
      trong response. Hash được thực hiện ở entity lifecycle; migration chuyển hash cho
      mật khẩu cũ; focused entity/repository tests pass.
- [x] **P0.4 — Chặn IDOR trên các module.** Rà soát quyền sở hữu cho user, media,
      collections, flash cards, comments và các endpoint đọc/cập nhật/xóa theo ID. Thêm
      test từ chối truy cập chéo cho các tài nguyên đó; quyền admin được kiểm tra tường
      minh trong controller/service.
- [x] **P0.5 — Củng cố luồng refresh token.** Duy trì xác minh chữ ký, expiration và
      hash đang lưu; luân chuyển refresh token khi refresh, vô hiệu hóa token cũ/logout,
      và kiểm thử replay, token hết hạn và sai chữ ký. Refresh token cũ chỉ được tiêu thụ
      thành công một lần.
- [x] **P0.6 — Bổ sung giới hạn thử đăng nhập.** Auth endpoints có giới hạn 5 request/phút;
      test HTTP xác nhận request thứ sáu nhận `429` và không gọi handler. Bộ nhớ mặc định
      của throttler giới hạn theo process; dự án nhiều replica cần chọn shared storage nếu
      cần quota toàn cụm.

### Thông tin bí mật và OAuth

- [x] **P0.7 — Loại bỏ thông tin xác thực Swagger hard-code.** Bỏ `admin:admin` khỏi
      `src/configs/api-docs.config.ts`; tắt Swagger mặc định trên production hoặc bảo vệ
      bằng cơ chế secrets/SSO được cấu hình qua môi trường. Không bật docs nếu thiếu cấu
      hình bảo vệ. Production mặc định tắt Swagger; khi bật, thông tin xác thực lấy từ
      biến môi trường đã validate.
- [x] **P0.8 — Nạp JWT signing keys ổn định ở runtime.** Keys không tự sinh khi import
      module; cấu hình bắt buộc, độ dài tối thiểu và placeholder được validate, app fail-fast
      nếu thiếu. Cách cấp secrets/rotate keys là trách nhiệm của dự án sử dụng base.
- [x] **P0.9 — Hoàn thiện OAuth callback an toàn.** Callback xác thực OAuth state dùng
      một lần, đặt token trong HttpOnly cookies và redirect tới frontend URL đã cấu hình;
      unit tests bao phủ state mismatch và cookie behavior. Kiểm thử provider thật cần
      credentials/callback domain riêng của mỗi dự án.
- [x] **P0.10 — Rà soát secrets/config.** Không commit credentials; validate đủ biến môi
      trường bắt buộc theo môi trường, từ chối giá trị placeholder trong production và
      không log secret/token/password. Bổ sung cách khởi tạo secrets an toàn vào tài liệu.
      Production Compose smoke test dùng credentials giả được tạo tạm và đã dọn sau test.

### Dữ liệu và tải tệp lên

- [x] **P0.11 — Giới hạn upload tại transport layer.** Cấu hình Multer/FileInterceptor
      với giới hạn kích thước, số file và loại file cho từng endpoint; kiểm tra nội dung
      file thay vì chỉ tin MIME type do client gửi. Tests xác nhận limits, MIME rejection,
      magic bytes và file rỗng.
- [x] **P0.12 — Phân quyền media.** Kiểm tra quyền sở hữu/quyền truy cập trước khi trả
      metadata, presigned URL hoặc xóa file; xác minh thời hạn presigned URL và tránh trả
      thông tin nội bộ của storage; có test owner/admin, thời hạn URL và response không
      chứa key/bucket.
- [x] **P0.13 — Ngăn lộ dữ liệu nhạy cảm.** Chuẩn hóa serialization/DTO response để
      không xuất password hash, refresh token hash, thông tin nội bộ và trường riêng tư;
      có regression tests cho user serialization và media-safe response.

## P1 — Điều kiện vận hành

### Môi trường chạy và đóng gói ứng dụng

- [x] **P1.1 — Sửa production Docker image.** Dùng `npm ci` và lockfile; tạo image
      multi-stage gọn, chỉ copy artifacts/runtime files cần thiết, chạy bằng non-root,
      đặt `NODE_ENV=production`, và không copy `.env`, `secure/`, tests hoặc source không
      cần thiết vào image. Production image cuối cùng đã build thành công.
- [x] **P1.2 — Chọn cách chạy migrations tương thích image.** Hiện tài liệu hướng dẫn
      `npm run migration:run` trong container nhưng script cần `ts-node` trong
      devDependencies. Chọn một cách có thể chạy ở production (build migration runner
      vào artifacts hoặc image/job migrate riêng), chạy migration như bước release có
      kiểm soát và cập nhật `docs/DEPLOYMENT.md`. Compose production smoke test đã
      chạy migration job thành công từ compiled artifacts.
- [x] **P1.3 — Thu hẹp network exposure.** Không publish PostgreSQL/Redis ports ra
      public host trong cấu hình production mặc định; giữ chúng trên private Docker
      network. Publish API chỉ lên loopback hoặc sau reverse proxy/load balancer theo mô
      hình deploy. Smoke test xác nhận các dependency không publish port ra host.
- [x] **P1.4 — Sửa Redis health check và xác thực.** Probe phải xác thực bằng cấu hình
      Redis hiện tại và thật sự kiểm tra trạng thái server. Hạn chế quyền truy cập,
      kiểm tra persistence/eviction policy phù hợp với loại dữ liệu trong từng queue và
      không đưa password vào process arguments/log nếu có lựa chọn an toàn hơn. Redis
      healthcheck xác thực thành công trong Compose smoke test.
- P1.5 — Resource/capacity, compose topology và replica sizing: cấu hình riêng theo
  dự án, không phải tiêu chí chất lượng application source.
- [x] **P1.6 — Health/readiness checks có ý nghĩa.** Tách liveness khỏi readiness; kiểm
      tra các phụ thuộc cần thiết (DB/Redis) trong readiness mà không để probe gây tải lớn.
      Đảm bảo đường dẫn, port và timeout khớp cấu hình runtime. API đạt container
      `healthy`; `/health/ready` trả `ready` trong Compose smoke test.

### Cơ sở dữ liệu và phục hồi

- [x] **P1.7 — Kiểm thử migration dữ liệu nâng cấp.** Chạy migration schema ban đầu,
      chèn user/dữ liệu đại diện theo phiên bản cũ, rồi chạy migration bảo mật trên
      PostgreSQL 16 thật. Xác nhận user còn nguyên, password được hash, refresh token cũ
      bị revoke và enum role được nâng cấp.
- [x] **P1.8 — Cung cấp quy trình backup/restore mẫu.** `docs/OPERATIONS_BACKUP_RESTORE.md`
      hướng dẫn dump dạng archive và restore vào database riêng; chưa thực hiện restore
      drill trên môi trường vận hành. Mã hóa, nơi lưu off-host, lịch, retention và RPO/RTO
      vẫn phải do từng dự án cấu hình và diễn tập.
- [x] **P1.9 — Cấu hình connection pool/timeouts.** Đặt giới hạn pool dựa trên tổng số
      replicas và giới hạn DB; cấu hình timeout phù hợp, theo dõi connection exhaustion.
      Pool size và connection/query timeout hiện được cấu hình qua environment; mỗi dự án
      vẫn phải điều chỉnh pool theo giới hạn DB và tổng replicas.

### Chất lượng và kiểm thử

- [x] **P1.10 — Làm xanh và mở rộng unit tests.** Cập nhật các spec lỗi thời theo API
      hiện tại, bỏ hai spec auth trùng lặp đã không còn tương thích, cấu hình Jest bỏ qua
      artifacts trong `dist`, thêm HTTP throttling, token expiration config và migration
      regression tests. Kết quả suite hiện tại được ghi ở phần tiến độ phía trên.
- [x] **P1.11 — Thêm CI quality gates.** GitLab pipeline chạy build, unit/e2e,
      lint và dependency audit; production image được package sau khi các stage kiểm thử
      thành công. Deployment vẫn cần target và rollback riêng của dự án.
- [x] **P1.12 — Bổ sung account lifecycle tùy chọn.** Password reset và email
      verification dùng SMTP cấu hình riêng, token một lần có thời hạn chỉ lưu hash;
      bật bắt buộc xác minh email sẽ fail-fast nếu email flows/SMTP chưa được cấu hình.
      Reset password thu hồi refresh token; các hành động xác thực được audit.

## P2 — Gia cố và vận hành bền vững

### Phụ thuộc và an toàn môi trường chạy

- [x] **P2.1 — Xử lý dependency advisories.** Nâng đồng bộ các package NestJS có
      advisory lên v12 và cập nhật Jest/TypeScript ESLint bị ảnh hưởng trong dependency
      graph. `npm audit` và `npm audit --omit=dev` đều xác nhận 0 vulnerabilities; build,
      tests và lint pass trên bộ phiên bản mới.
- P2.2 — Dependency update automation/SLA là policy của repo CI; Dependabot và
  `npm audit --audit-level=high` gate đã có cấu hình mẫu.
- [x] **P2.3 — Security headers và CORS.** Bật Helmet và allowlist origin từ cấu hình;
      credentials chỉ bật khi có origin allowlist. TLS/reverse proxy/trusted proxy phải
      được cấu hình và nghiệm thu ở hạ tầng của từng dự án.
- [x] **P2.4 — Chuẩn hóa validation/error handling và API response.** `ValidationPipe`
      bật whitelist, từ chối field ngoài DTO và transform dữ liệu. Global interceptor và
      exception filter định dạng thống nhất success, lỗi HTTP và lỗi validation theo
      `docs/API_RESPONSE_CONTRACT.md`; lỗi server 5xx không lộ chi tiết nội bộ. Mỗi
      module/dự án vẫn cần giữ DTO và body limits phù hợp.

### Khả năng quan sát và hiệu năng

- [x] **P2.5 — Logging có cấu trúc.** Ghi request ID/correlation ID, method, route,
      status, duration và lỗi có kiểm soát; không log body nhạy cảm, Authorization header
      hay presigned URL. `nestjs-pino` là logger toàn cục, HTTP request được log một
      lần dạng structured JSON và gắn request ID; việc thu nhận log tập trung cấu hình
      tại deployment.
- [x] **P2.6 — Thêm metrics và audit events nền tảng.** Bật `ENABLE_METRICS` để
      expose Prometheus HTTP counters/latency với route labels bounded; audit events lưu
      sign-in/refresh/logout, password reset và email verification. Scraping, dashboards,
      alert routing, tracing exporter và retention policy vẫn tùy từng dự án.
- [x] **P2.7 — Queue reliability.** Email, image và notification jobs đều cấu hình
      retry/backoff cùng retention hữu hạn; mock processor bị chặn ở production và không
      log địa chỉ email, nội dung notification hoặc object key. Khi chưa có provider,
      `UnrecoverableError` làm job fail rõ ràng, không retry và không giả báo hoàn tất.
      Tests xác nhận retry/retention cho cả ba queue và loại lỗi không retry. Trước khi
      bật queue cho nghiệp vụ thật, từng dự án vẫn cần provider, idempotency và timeout
      phù hợp với side effect.
- P2.8 — Load/capacity tests cần workload, SLA và hạ tầng mục tiêu của từng dự án.

### Tài liệu và trải nghiệm nền tảng dự án

- [x] **P2.9 — Bổ sung hướng dẫn khởi tạo/tùy biến base.** `README.md` và
      `docs/PROJECT_GUIDE.md` mô tả scope, module, luồng, và cách mở rộng;
      `docs/API_SUMMARY.md` liệt kê endpoint; `docs/CONFIGURATION_GUIDE.md`,
      `docs/QUICK_START.md`, `docs/DATABASE_SETUP.md` và `docs/DEPLOYMENT.md`
      hướng dẫn config, local development, migration, build và deploy.
- [x] **P2.10 — Tạo checklist application khi khởi tạo dự án.** Trước khi release,
      dự án cần thay domain và OAuth callback; cấu hình/kiểm tra JWT secrets; chỉ bật
      provider đã tích hợp; allowlist CORS; thiết lập upload/storage và giới hạn file;
      rà soát dữ liệu cá nhân/response DTO; kiểm tra validation và authorization ownership;
      bổ sung tests cho luồng nghiệp vụ riêng; xác nhận queue không còn dùng mock processor.
- [x] **P2.11 — Xác minh source clean-start.** `npm ci`, build, unit tests, lint,
      audit, production Docker image build và production container/Compose smoke test
      đều được xác minh trên source hiện tại. E2E 6/6 suites đã pass ở lần kiểm chứng
      trước; cần chạy lại trong môi trường PostgreSQL/Redis của từng fork. Mỗi fork vẫn
      cần lặp lại trên commit đã chọn.
- [x] **P2.12 — Đưa domain mẫu ra khỏi luồng mặc định.** Route của các domain Flash
      Cards có feature flags để dự án có thể ẩn module mẫu; student-card upload stub bị
      tắt mặc định. Flags không gỡ module/table/migration khỏi ứng dụng, dự án mới cần
      xóa domain và xử lý migration riêng nếu muốn loại bỏ hoàn toàn.

## Đánh giá lại theo môi trường (phạm vi nhà phát triển/ứng dụng)

- **Local development:** phù hợp để bắt đầu phát triển; có Quick Start, `.env.dev`,
  Docker dependencies, migrations, build, unit/e2e tests và lint.
- **Staging:** Joi áp dụng các ràng buộc bảo mật tương đương production cho JWT
  secrets, Redis password, HTTPS frontend URL và Swagger. Cấu hình staging vẫn cần
  được inject từ runtime/Compose vì app và migration CLI không tự đọc `.env.staging`.
- **Production application runtime:** có build production, validation fail-fast cho
  cấu hình production, migrations chạy tách trước API, liveness/readiness, giới hạn
  DB pool/timeouts và các tests đã nêu ở phần trên. Đây là nền source có thể tái sử
  dụng, không phải xác nhận mọi domain/provider đã sẵn sàng: route domain mẫu tắt mặc
  định, student-card upload là stub 501, queue processor cần provider thật, và OAuth/
  S3/SMTP chỉ được xác minh khi cấu hình integration riêng.

Kết luận: **phù hợp làm application base có điều kiện** sau khi dự án thay/loại domain
mẫu, rà soát authorization/DTO và kiểm thử integration của chính mình. Không nên mô tả
nó là production-ready cho mọi sản phẩm hoặc workload chỉ dựa trên build/test pass.

## Điều kiện nghiệm thu nền tảng ứng dụng

- [x] Tất cả task P0 hoàn thành; không còn đường truy cập trái phép đã biết tới dữ liệu
      hoặc thao tác quản trị.
- [x] Access token hết hạn/sai chữ ký bị từ chối; authorization và ownership có test
      âm tính cho các route nhạy cảm.
- [x] Secrets không có giá trị mặc định/placeholder ở production; JWT keys bắt buộc
      được cấu hình ổn định từ môi trường. Cấp phát/đồng bộ key giữa replicas là việc của
      từng dự án.
- [x] Unit tests, lint và build pass; regression tests bao phủ auth, authorization,
      validation, upload và response serialization.
- [x] Không có production dependency advisory chưa được khắc phục; `npm audit` hiện
      báo 0 vulnerabilities trên cả production và development dependencies.

## Ghi chú về phạm vi

Checklist này chỉ đánh giá chất lượng application source. Mỗi dự án dùng base vẫn cần
tự nghiệm thu provider credentials, deployment, secret provisioning, staging, backup,
observability, capacity, compliance và rollback theo môi trường thật; các việc đó không
được tính là phần còn thiếu của application code base.
