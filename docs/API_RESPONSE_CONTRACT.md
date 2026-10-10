# Quy ước phản hồi API

Tất cả endpoint HTTP của NestJS dùng chung một cấu trúc JSON cho phản hồi thành
công, lỗi nghiệp vụ và lỗi kiểm tra dữ liệu đầu vào.

## Cấu trúc phản hồi

Thành công:

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "id": "resource-id"
  },
  "errors": null,
  "errorCode": null
}
```

Thất bại:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "data": null,
  "errors": [
    "email must be an email",
    "property extra should not exist"
  ],
  "errorCode": "VALIDATION_FAILED"
}
```

`statusCode` khớp với HTTP status thực tế. `data` chứa dữ liệu trả về khi thành
công và là `null` khi thất bại. `errors` là `null` khi thành công; nếu dữ liệu đầu
vào không hợp lệ, trường này chứa danh sách lỗi cụ thể theo từng trường. Với các
lỗi HTTP khác có thông báo an toàn cho client, thông báo được đặt trong `message`
và `errors` là `null`. `errorCode` là mã ổn định để client phân nhánh xử lý. Lỗi
validation dùng `VALIDATION_FAILED`; NestJS HTTP exception thông thường được gán
mã theo HTTP status trong khi vẫn giữ message do exception cung cấp. Lỗi 503 dùng
mã `SERVICE_UNAVAILABLE`; các lỗi 5xx còn lại dùng `INTERNAL_SERVER_ERROR`. Cả
hai đều trả message chung để tránh làm lộ chi tiết nội bộ.

## Cấu hình toàn cục

`AppModule` đăng ký toàn cục `ResponseInterceptor` và `ApiExceptionFilter` thông
qua `APP_INTERCEPTOR` và `APP_FILTER` của NestJS. Trong bootstrap, `ValidationPipe`
toàn cục được cấu hình với `whitelist`, `forbidNonWhitelisted` và `transform`.
Vì vậy, controller không cần tự gọi formatter cho phản hồi thông thường hoặc tự
bọc các HTTP exception. Các binding này nằm trong `src/app.module.ts`; cấu hình
DTO validation nằm trong `src/main.ts`. `ResponseInterceptor` được Nest inject
`Reflector` để đọc metadata của decorator.

Quy tắc áp dụng mặc định cho JSON response từ controller. Endpoint chủ động dùng
`@Res()` để tự gửi response (ví dụ Google OAuth callback redirect) không được
interceptor tự bọc như JSON API. Với `@Res({ passthrough: true })`, Nest vẫn gửi
giá trị controller trả về nên interceptor tiếp tục áp dụng. Các endpoint health
hiện cũng dùng envelope chung.

Formatter dùng chung là `ApiResponseFormatter` tại
`src/shared/api-response.formatter.ts`:

```ts
ApiResponseFormatter.success(data, message, statusCode);
ApiResponseFormatter.failure(statusCode, message, errors, errorCode);
```

Dùng `success` khi cần tạo rõ ràng response envelope với message tùy chỉnh. Các
giá trị trả về thông thường của controller sẽ được interceptor tự bọc.

## Thông báo thành công

Message thành công được quản lý tập trung trong `src/shared/api-success.ts`.
Endpoint có message riêng khai báo mã catalog một lần bằng decorator
`@ApiSuccessMessage(...)`; không truyền message tự do vào từng service/controller:

```ts
@Post()
@ApiSuccessMessage('FLASH_CARD_CREATED')
create(@Body() dto: CreateFlashCardDto) {
  return this.flashCardsService.create(dto);
}
```

Interceptor lấy message từ `API_SUCCESS_CATALOG` và đưa vào response envelope.
Endpoint chưa khai báo mã dùng `Success` (hoặc `Resource created successfully`
cho HTTP 201). Muốn đổi wording dùng chung thì sửa catalog; muốn một endpoint có
message khác thì thêm mã vào catalog và gắn mã đó bằng decorator.

Các bước thêm success message:

1. Thêm mã và nội dung vào `API_SUCCESS_CATALOG` trong
   `src/shared/api-success.ts`.
2. Gắn `@ApiSuccessMessage('NEW_CODE')` lên handler cần dùng message đó.
3. Kiểm tra response HTTP để bảo đảm message đúng và endpoint vẫn trả đúng status
   cùng `data`.

Mã decorator được kiểm tra ở TypeScript theo các key của catalog. Không dùng
`ApiResponseFormatter.success(...)` trong controller thông thường; nếu tự trả một
envelope đầy đủ, interceptor giữ nguyên object đó và không áp dụng catalog.

## Khai báo và xử lý lỗi

Khi có lỗi, hãy ném HTTP exception phù hợp của NestJS, ví dụ
`throw new NotFoundException('Record not found')`. Exception filter toàn cục sẽ
gọi `failure`, giữ nguyên HTTP status và gán error code mặc định theo status
(`NOT_FOUND` cho 404, `FORBIDDEN` cho 403, `CONFLICT` cho 409, v.v.). Các lỗi
domain lặp lại nên dùng `ApiException` để có mã riêng thay vì chỉ dựa trên mã
chung theo status. Có thể đặt HTTP status tùy chỉnh qua NestJS (`@HttpCode(...)`
hoặc response API); tham số `statusCode` của formatter chỉ xác định status trong
response body, không tự thay đổi HTTP status.

Các HTTP status đang có mã mặc định:

| HTTP status | Error code mặc định |
| --- | --- |
| 400 | `BAD_REQUEST` |
| 401 | `UNAUTHORIZED` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 409 | `CONFLICT` |
| 422 | `UNPROCESSABLE_ENTITY` |
| 429 | `TOO_MANY_REQUESTS` |
| 503 | `SERVICE_UNAVAILABLE` |
| 500 trở lên, trừ 503 | `INTERNAL_SERVER_ERROR` |

Các status khác chưa có ánh xạ sẽ có `errorCode: null`; HTTP status thực tế vẫn
được giữ nguyên. Lỗi 503 luôn được trả với message chung và mã
`SERVICE_UNAVAILABLE`; các lỗi 5xx khác dùng message chung và mã
`INTERNAL_SERVER_ERROR`, kể cả khi exception có message riêng.

Các lỗi dùng chung được khai báo một lần trong `src/shared/api-errors.ts`. Dùng
`ApiException` với mã có sẵn để tránh lặp message:

```ts
throw new ApiException('FLASH_CARD_ACCESS_DENIED');
```

Exception lấy HTTP status và message mặc định từ `API_ERROR_CATALOG`; exception
filter trả thêm `errorCode` để client có thể dựa vào mã thay vì so sánh message.
Khi cùng loại lỗi nhưng cần message cụ thể cho một trường hợp, có thể override
message tại nơi gọi mà vẫn dùng lại error code:

```ts
throw new ApiException(
  'FLASH_CARD_ACCESS_DENIED',
  'You cannot access this flash card',
);
```

Message override chỉ thay nội dung `message`; client vẫn nhận cùng error code và
HTTP status. Nếu muốn loại lỗi domain có mã ổn định, thêm mã, status và message
mặc định vào `API_ERROR_CATALOG`, sau đó ném `ApiException` bằng mã đó. Không cần
sửa formatter hay exception filter cho từng mã mới. NestJS exception thông thường
giữ message do caller cung cấp và nhận mã chung theo status.

Riêng exception có `message` dạng mảng được filter chuẩn hóa thành
`VALIDATION_FAILED`; danh sách string được đưa vào `errors`. `ValidationPipe` hiện
dùng định dạng này cho lỗi DTO. Các lỗi validation và các lỗi ứng dụng khác không
nên cùng dùng message dạng mảng nếu không muốn bị phân loại như validation.

Tránh đưa dữ liệu nhạy cảm vào message của exception 4xx: filter giữ message đó
để gửi cho client. Chi tiết của lỗi 5xx được ghi log server-side, không gửi ra
client.

## Luồng xử lý khi endpoint trả dữ liệu

1. Controller hoặc service trả về kết quả thông thường, chưa bọc envelope.
2. `ResponseInterceptor` nhận kết quả handler, đọc HTTP status do NestJS chọn và
   kiểm tra mã response thành công khai báo bằng `@ApiSuccessMessage`.
3. Interceptor lấy message từ `API_SUCCESS_CATALOG` (hoặc dùng message mặc định
   nếu endpoint chưa khai báo), sau đó gọi
   `ApiResponseFormatter.success(result, message, response.statusCode)`.
4. Client nhận envelope thành công theo quy ước cùng HTTP status tương ứng.

Nếu handler đã trả một object có đầy đủ các trường của response envelope
(`statusCode`, `message`, `data`, `errors` và `errorCode`), interceptor giữ nguyên
để tránh bọc lặp. Đây là lối thoát cho trường hợp đặc biệt; không nên dùng thay
cho quy tắc tự động trên toàn bộ controller.

## Luồng xử lý khi endpoint gặp lỗi

1. Controller/service ném một `HttpException` của NestJS, hoặc `ValidationPipe`
   toàn cục từ chối DTO không hợp lệ. Các lỗi không mong đợi cũng được chuyển đến
   NestJS xử lý.
2. Success interceptor không chuyển lỗi thành dữ liệu; lỗi được chuyển tiếp tới
   `ApiExceptionFilter`.
3. Filter xác định HTTP status và thông báo dành cho client. Với exception có
   `message` dạng mảng, `message` là `Validation failed`, `errorCode` là
   `VALIDATION_FAILED`, còn `errors` chứa danh sách string. `ApiException` giữ
   error code riêng trong catalog; NestJS HTTP exception thông thường giữ message
   của exception và nhận mã theo status. Với lỗi không mong đợi hoặc lỗi 5xx,
   filter ghi log phía server và chỉ gửi message chung; lỗi 503 có mã
   `SERVICE_UNAVAILABLE`, các lỗi 5xx khác có mã `INTERNAL_SERVER_ERROR`.
4. Filter gọi
   `ApiResponseFormatter.failure(statusCode, message, errors, errorCode)` và trả
   envelope với HTTP status tương ứng.

Quy ước response API được kiểm tra bằng unit test và HTTP-level test cho thành
công có message riêng, lỗi validation, lỗi catalog và NestJS HTTP exception thông
thường. Các phản hồi do controller tự gửi trực tiếp qua `@Res()` không nằm trong
luồng envelope tự động và cần được kiểm thử theo hợp đồng riêng của chúng.
