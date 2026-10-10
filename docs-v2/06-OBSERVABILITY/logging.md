# Logging

Hệ thống logging có cấu trúc với Pino logger.

## Tổng quan

- **Framework**: Pino logger
- **Format**: JSON (production) / Pretty (development)
- **Output**: Stdout
- **Levels**: Fatal, Error, Warn, Info, Debug, Trace
- **Context**: Request ID, User ID, IP, etc.

## Configuration

### Environment Variables

```env
LOG_LEVEL=info
LOG_FORMAT=json
```

### Log Levels

| Level | Usage | Production |
|-------|-------|-------------|
| `fatal` | System cannot recover | Yes |
| `error` | Error conditions | Yes |
| `warn` | Warning conditions | Yes |
| `info` | Informational messages | Yes |
| `debug` | Debug information | No |
| `trace` | Very detailed tracing | No |

### Log Format

**Development (Pretty):**
```
[10:00:00.000] INFO (12345): HTTP GET /users 200 45ms
```

**Production (JSON):**
```json
{
  "level": "info",
  "time": 1696944000000,
  "pid": 12345,
  "hostname": "api-server-1",
  "context": "requestId",
  "msg": "HTTP GET /users 200 45ms",
  "method": "GET",
  "url": "/users",
  "status": 200,
  "duration": 45
}
```

## Logger Setup

### Pino Configuration

```typescript
// src/configs/logger.config.ts
import pino from 'pino';

export const loggerConfig = {
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.LOG_FORMAT === 'pretty'
    ? pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        ignore: 'pid,hostname',
      },
    })
    : undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: {
    paths: ['password', 'token', 'secret'],
    remove: true,
  },
};
```

### Logger Module

```typescript
// src/configs/logger.module.ts
import { Module } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
```

### Logger Service

```typescript
// src/configs/logger.service.ts
import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import pino from 'pino';

@Injectable()
export class LoggerService extends NestLoggerService {
  private logger = pino(loggerConfig);

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { context, trace });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.trace(message, { context });
  }

  setContext(key: string, value: any) {
    this.logger = this.logger.child({ [key]: value });
  }
}
```

## Logging Patterns

### HTTP Request Logging

```typescript
// src/middleware/logging.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = uuidv4();
    const startTime = Date.now();

    req['requestId'] = requestId;

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { method, url, statusCode } = req;

      this.logger.info('HTTP Request', {
        requestId,
        method,
        url,
        statusCode,
        duration,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
    });

    next();
  }
}
```

### Application Logging

```typescript
// In service
constructor(private logger: LoggerService) {}

async createUser(dto: CreateUserDto) {
  this.logger.info('Creating user', { email: dto.email });

  try {
    const user = await this.repository.create(dto);
    this.logger.info('User created successfully', { userId: user.id });
    return user;
  } catch (error) {
    this.logger.error('Failed to create user', {
      email: dto.email,
      error: error.message,
    });
    throw error;
  }
}
```

### Error Logging

```typescript
// In exception filter
catch(exception: unknown, host: ArgumentsHost) {
  const ctx = host.switchToHttp();
  const response = ctx.getResponse<Response>();
  const request = ctx.getRequest();

  this.logger.error('Unhandled exception', {
    requestId: request['requestId'],
    method: request.method,
    url: request.url,
    error: exception instanceof Error ? exception.stack : exception,
  });

  // ... handle exception
}
```

## Log Context

### Request ID

```typescript
// Add request ID to all logs
req['requestId'] = uuidv4();

// In service
this.logger.setContext('requestId', req['requestId']);
this.logger.info('Processing request');
```

### User Context

```typescript
// Add user context after authentication
this.logger.setContext('userId', user.id);
this.logger.setContext('userEmail', user.email);
```

### Business Context

```typescript
// Add business context
this.logger.info('Processing payment', {
  orderId: order.id,
  amount: order.amount,
  currency: order.currency,
});
```

## Sensitive Data Redaction

### Automatic Redaction

```typescript
{
  redact: {
    paths: ['password', 'token', 'secret', 'apiKey'],
    remove: true,
  },
}
```

### Manual Redaction

```typescript
// ✅ DO: Redact sensitive data
this.logger.info('User login', {
  userId: user.id,
  email: user.email,
  // password is automatically redacted
});

// ❌ DON'T: Log sensitive data
this.logger.info('User login', { password: user.password });
```

## Log Levels in Practice

### When to use each level

**Fatal:**
- System cannot continue
- Database connection lost permanently
- Out of disk space

**Error:**
- Unhandled exceptions
- External service failures
- Database query failures

**Warn:**
- Deprecated API usage
- Slow queries
- High memory usage
- Retry attempts

**Info:**
- User actions (login, logout)
- State changes
- Successful operations
- Business events

**Debug:**
- Detailed execution flow
- Variable values
- Function entry/exit

**Trace:**
- Very detailed debugging
- Library internals
- Performance profiling

## Structured Logging

### Best Practices

```typescript
// ❌ DON'T: String concatenation
logger.info('User ' + user.id + ' logged in from ' + ip);

// ✅ DO: Structured object
logger.info('User logged in', {
  userId: user.id,
  email: user.email,
  ip,
  userAgent,
});
```

### Error Context

```typescript
// ❌ DON'T: Generic error message
logger.error('Failed to create user');

// ✅ DO: Include context
logger.error('Failed to create user', {
  email: dto.email,
  error: error.message,
  stack: error.stack,
  databaseError: error.detail,
});
```

## Log Aggregation

### Sending to Loki

```typescript
// Using pino-loki
import pino from 'pino';
import { transmit } from 'pino-loki';

const transport = transmit({
  host: process.env.LOKI_HOST,
  port: 3100,
  labels: {
    app: 'nestjs-api',
    env: process.env.NODE_ENV,
  },
});

const logger = pino({
  level: 'info',
  transport,
});
```

### Docker Logs

Logs from containers:

```bash
# View application logs
docker logs flash_cards_api_dev

# Follow logs
docker logs -f flash_cards_api_dev

# Last 100 lines
docker logs --tail=100 flash_cards_api_dev
```

### Cloud Logging

**AWS CloudWatch:**
```typescript
import { CloudWatchLogs } from '@aws-sdk/client-cloudwatch-logs';
```

**Google Cloud Logging:**
```typescript
import { Logging } from '@google-cloud/logging';
```

## Performance Considerations

### Async Logging

Pino is synchronous and fast, but for high-throughput:

```typescript
// Use child logger for context
const childLogger = logger.child({ requestId });

// Use appropriate log level
if (process.env.NODE_ENV === 'production') {
  // Reduce debug logging
  logger.level = 'info';
}
```

### Sampling

Sample only percentage of logs:

```typescript
const shouldLog = Math.random() < 0.1; // 10% sampling
if (shouldLog) {
  logger.debug('Detailed debug info');
}
```

## Troubleshooting

### Logs not appearing

**Check:**
- Logger module imported
- Logger instance created
- Log level set correctly
- Stdout not redirected

### JSON logs hard to read

**Solution:**
```bash
# Use jq to parse
docker logs api | jq

# Or use pino-pretty in development
LOG_FORMAT=pretty
```

### Logs too verbose

**Solution:**
```env
LOG_LEVEL=warn  # Only warnings and errors
```

### Missing context

**Check:**
- Context set before logging
- Context propagated through async calls
- Child logger used consistently

## Best Practices Summary

1. **Use structured logging** - Objects, not strings
2. **Add context** - Request ID, user ID, business context
3. **Redact sensitive data** - Passwords, tokens, secrets
4. **Use appropriate levels** - Debug in dev, Info in prod
5. **Log errors with context** - Include stack trace in dev
6. **Don't log in hot loops** - Use sampling or rate limiting
7. **Aggregate logs centrally** - Loki, CloudWatch, etc.
8. **Monitor log volume** - Set alerts for spikes

## Tài liệu liên quan

- [Observability Overview](README.md)
- [Monitoring](monitoring.md)
- [Configuration](../05-CAU-HINH/environment-variables.md)
