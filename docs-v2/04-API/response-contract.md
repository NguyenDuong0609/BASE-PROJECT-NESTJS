# API Response Contract

Contract chuẩn hóa cho tất cả API responses và errors.

## Tổng quan

Tất cả API responses sử dụng envelope chuẩn hóa để:

- Đảm bảo consistency
- Dễ dàng parse bởi client
- Chuẩn hóa error handling
- Support pagination metadata

## Success Response

### Single Resource

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "id": "uuid",
    "name": "Resource Name"
  }
}
```

### Collection

```json
{
  "success": true,
  "message": "Resources retrieved",
  "data": [
    { "id": "uuid-1", "name": "Item 1" },
    { "id": "uuid-2", "name": "Item 2" }
  ]
}
```

### Paginated Response

```json
{
  "success": true,
  "message": "Resources retrieved",
  "data": [
    { "id": "uuid-1", "name": "Item 1" },
    { "id": "uuid-2", "name": "Item 2" }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### No Content (Delete)

```http
HTTP/1.1 204 No Content
```

Không có body response cho successful DELETE.

## Error Response

### Standard Error Format

```json
{
  "success": false,
  "message": "Error message",
  "error": {
    "code": "ERROR_CODE",
    "statusCode": 400,
    "details": {
      "field": "email",
      "message": "Invalid email format"
    }
  }
}
```

### Validation Error (422)

```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "statusCode": 422,
    "details": [
      {
        "field": "email",
        "message": "email must be a valid email address"
      },
      {
        "field": "password",
        "message": "password must be at least 8 characters"
      }
    ]
  }
}
```

### Not Found (404)

```json
{
  "success": false,
  "message": "Resource not found",
  "error": {
    "code": "NOT_FOUND",
    "statusCode": 404,
    "details": {
      "resource": "User",
      "id": "uuid"
    }
  }
}
```

### Unauthorized (401)

```json
{
  "success": false,
  "message": "Authentication required",
  "error": {
    "code": "UNAUTHORIZED",
    "statusCode": 401,
    "details": {
      "reason": "Invalid or expired token"
    }
  }
}
```

### Forbidden (403)

```json
{
  "success": false,
  "message": "Access denied",
  "error": {
    "code": "FORBIDDEN",
    "statusCode": 403,
    "details": {
      "reason": "Insufficient permissions"
    }
  }
}
```

### Conflict (409)

```json
{
  "success": false,
  "message": "Resource conflict",
  "error": {
    "code": "CONFLICT",
    "statusCode": 409,
    "details": {
      "field": "email",
      "value": "user@example.com",
      "reason": "Email already exists"
    }
  }
}
```

### Rate Limit Exceeded (429)

```json
{
  "success": false,
  "message": "Too many requests",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "statusCode": 429,
    "details": {
      "limit": 100,
      "remaining": 0,
      "resetAt": "2026-10-10T11:00:00.000Z"
    }
  }
}
```

### Internal Server Error (500)

```json
{
  "success": false,
  "message": "Internal server error",
  "error": {
    "code": "INTERNAL_ERROR",
    "statusCode": 500,
    "details": {
      "requestId": "uuid"
    }
  }
}
```

**Lưu ý:** Production không expose stack trace hay internal error details.

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 422 | Input validation failed |
| `NOT_FOUND` | 404 | Resource not found |
| `UNAUTHORIZED` | 401 | Authentication failed |
| `TOKEN_EXPIRED` | 401 | Token expired |
| `FORBIDDEN` | 403 | Access denied |
| `CONFLICT` | 409 | Resource conflict |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |
| `BAD_REQUEST` | 400 | Invalid request |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Unsupported media type |

## HTTP Status Codes

### Success (2xx)

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Request successful |
| 201 | Created | Resource created |
| 204 | No Content | Successful delete/update with no response body |

### Client Errors (4xx)

| Code | Meaning | Usage |
|------|---------|-------|
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Authentication required/failed |
| 403 | Forbidden | Authorization failed |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict |
| 413 | Payload Too Large | File too large |
| 415 | Unsupported Media Type | Invalid file type |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |

### Server Errors (5xx)

| Code | Meaning | Usage |
|------|---------|-------|
| 500 | Internal Server Error | Unexpected error |
| 503 | Service Unavailable | Maintenance or dependency down |

## Implementation

### Response Interceptor

```typescript
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, any>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        message: data.message || 'Operation successful',
        data: data.data || data,
        meta: data.meta || undefined,
      })),
    );
  }
}
```

### Exception Filter

```typescript
@Catch()
export class HttpExceptionFilter
  implements ExceptionFilter
{
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let details: any = { requestId: request.id };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else {
        message = (exceptionResponse as any).message || message;
        code = (exceptionResponse as any).code || code;
        details = { ...details, ...(exceptionResponse as any).details };
      }
    }

    // Log error
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : exception,
    );

    response.status(status).json({
      success: false,
      message,
      error: {
        code,
        statusCode: status,
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
    });
  }
}
```

### Custom Exceptions

```typescript
export class ApiException extends HttpException {
  constructor(
    message: string,
    code: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: any,
  ) {
    super(
      {
        message,
        code,
        details,
      },
      statusCode,
    );
  }
}

// Usage
throw new ApiException(
  'Email already exists',
  'EMAIL_EXISTS',
  HttpStatus.CONFLICT,
  { email: dto.email },
);
```

## Success Messages

### Common Messages

| Operation | Message |
|-----------|---------|
| Create | "Resource created successfully" |
| Update | "Resource updated successfully" |
| Delete | "Resource deleted successfully" |
| Get | "Resource retrieved successfully" |
| List | "Resources retrieved successfully" |

### Module-specific Messages

| Module | Message |
|--------|---------|
| Auth | "User registered successfully", "Logged in successfully" |
| User | "Profile updated successfully", "Password changed successfully" |
| Media | "File uploaded successfully", "File deleted successfully" |
| Comment | "Comment created successfully", "Reply posted successfully" |

## Best Practices

### 1. Always Use Envelope

```typescript
// ❌ DON'T: Direct response
return user;

// ✅ DO: Envelope response
return { data: user };
```

### 2. Consistent Error Codes

```typescript
// ❌ DON'T: Different codes for same error
throw new BadRequestException('Invalid email');
throw new UnprocessableEntityException('Email invalid');

// ✅ DO: Consistent error code
throw new ApiException('Invalid email', 'VALIDATION_ERROR');
```

### 3. Include Request ID

```typescript
// Add to all error responses
details: {
  requestId: request.id,
  timestamp: new Date().toISOString(),
}
```

### 4. Hide Sensitive Details in Production

```typescript
details: process.env.NODE_ENV === 'development' 
  ? fullDetails 
  : { requestId: request.id };
```

### 5. Use Proper HTTP Status Codes

```typescript
// Choose appropriate status code
200 - Success
201 - Created
204 - No content
400 - Bad request
401 - Unauthorized
403 - Forbidden
404 - Not found
409 - Conflict
422 - Validation error
429 - Rate limit
500 - Server error
```

## Client Integration

### TypeScript Type Definitions

```typescript
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

interface ApiError {
  success: false;
  message: string;
  error: {
    code: string;
    statusCode: number;
    details?: any;
  };
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

### Axios Interceptor

```typescript
axios.interceptors.response.use(
  (response) => {
    if (response.data.success === false) {
      throw new Error(response.data.message);
    }
    return response.data.data;
  },
  (error) => {
    const apiError = error.response?.data;
    throw new Error(apiError?.message || 'Request failed');
  },
);
```

## Tài liệu liên quan

- [API Overview](README.md)
- [Swagger & Postman](swagger-postman.md)
- [Authentication](../03-CHUC-NANG/authentication.md)
