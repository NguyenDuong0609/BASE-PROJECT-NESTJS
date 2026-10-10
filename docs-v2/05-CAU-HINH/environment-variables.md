# Environment Variables

Danh sách đầy đủ các biến môi trường cấu hình hệ thống.

## Core Configuration

### Application

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `NODE_ENV` | string | `development` | No | `development`, `staging`, `production`, `test` |
| `PORT` | number | `3000` | No | API server port |
| `TRUST_PROXY_HOPS` | number | `0` | No | Number of trusted proxy hops |
| `LOG_LEVEL` | string | `debug` (dev) / `info` (prod) | No | `fatal`, `error`, `warn`, `info`, `debug`, `trace` |
| `LOG_FORMAT` | string | `pretty` (dev) / `json` (prod) | No | `pretty` or `json` |
| `FRONTEND_URL` | string | - | Yes | Frontend application URL |
| `CORS_ORIGINS` | string | - | No | Comma-separated allowed origins |

### Database (PostgreSQL)

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `DB_HOST` | string | - | Yes | PostgreSQL host (dev: `localhost`, docker: `postgres_db`) |
| `DB_PORT` | number | `5432` | No | PostgreSQL port |
| `DB_USERNAME` | string | - | Yes | Database username |
| `DB_PASSWORD` | string | - | Yes | Database password |
| `DB_DATABASE` | string | - | Yes | Database name |
| `DB_LOGGING` | boolean | `false` | No | Enable SQL logging |
| `DB_POOL_SIZE` | number | `10` | No | Connection pool size (1-100) |
| `DB_CONNECTION_TIMEOUT_MS` | number | `5000` | No | Connection timeout (min 100ms) |
| `DB_QUERY_TIMEOUT_MS` | number | `15000` | No | Query timeout (min 100ms) |

### Redis

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `REDIS_HOST` | string | `localhost` | No | Redis host (dev: `localhost`, docker: `redis`) |
| `REDIS_PORT` | number | `6379` | No | Redis port |
| `REDIS_PASSWORD` | string | - | No | Redis password (required in production, min 16 chars) |
| `REDIS_DB` | number | `0` | No | Redis logical database |
| `APP_CACHE_PREFIX` | string | `nestjs-base` | No | Cache key prefix |

### JWT Authentication

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `JWT_ACCESS_TOKEN_SECRET` | string | - | Yes | Access token secret (min 32 chars) |
| `JWT_REFRESH_TOKEN_SECRET` | string | - | Yes | Refresh token secret (min 32 chars, different from access) |
| `JWT_ACCESS_TOKEN_EXPIRATION` | string | `15m` | No | Access token TTL (e.g., `15m`, `1h`, `7d`) |
| `JWT_REFRESH_TOKEN_EXPIRATION` | string | `7d` | No | Refresh token TTL |

### File Upload

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `MAX_FILE_SIZE` | number | `10485760` | No | Max file size in bytes (10MB default, max 100MB) |
| `ALLOWED_FILE_TYPES` | string | - | No | Comma-separated MIME types |

### Swagger

| Variable | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `SWAGGER_ENABLED` | boolean | `false` | No | Enable Swagger UI |
| `SWAGGER_USERNAME` | string | - | Yes (if enabled) | Swagger username (min 16 chars) |
| `SWAGGER_PASSWORD` | string | - | Yes (if enabled) | Swagger password (min 16 chars) |

## Feature Flags

### Domain Modules

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ENABLE_FLASH_CARDS` | boolean | `false` | Enable flash cards routes |
| `ENABLE_COLLECTIONS` | boolean | `false` | Enable collections routes |
| `ENABLE_TOPICS` | boolean | `false` | Enable topics routes |
| `ENABLE_CHECKIN` | boolean | `false` | Enable check-in routes |
| `ENABLE_COMMENTS` | boolean | `false` | Enable comments routes |
| `ENABLE_FLASH_CARD_STATES` | boolean | `false` | Enable flash card state workflow |
| `ENABLE_STUDENT_CARD_UPLOADS` | boolean | `false` | Enable student card upload (stub 501) |

### Integrations

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ENABLE_S3` | boolean | `false` | Enable AWS S3 integration |
| `ENABLE_GOOGLE_OAUTH` | boolean | `false` | Enable Google OAuth |
| `ENABLE_ACCOUNT_EMAIL_FLOWS` | boolean | `false` | Enable email verification/password reset |
| `REQUIRE_VERIFIED_EMAIL` | boolean | `false` | Require email verification for login |
| `ENABLE_METRICS` | boolean | `false` | Enable Prometheus metrics |

## Third-party Integration

### AWS S3

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `AWS_REGION` | string | Yes (if S3 enabled) | AWS region |
| `AWS_S3_BUCKET` | string | Yes (if S3 enabled) | S3 bucket name |
| `AWS_ACCESS_KEY_ID` | string | No* | AWS access key (use IAM role if possible) |
| `AWS_SECRET_ACCESS_KEY` | string | No* | AWS secret key (use IAM role if possible) |

*Use workload identity/role in production instead of keys

### Google OAuth

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `GOOGLE_CLIENT_ID` | string | Yes (if OAuth enabled) | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | string | Yes (if OAuth enabled) | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | string | Yes (if OAuth enabled) | OAuth callback URL |

### SMTP (Email Flows)

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `SMTP_HOST` | string | Yes (if email flows enabled) | SMTP server host |
| `SMTP_PORT` | number | No | SMTP server port (default: 587) |
| `SMTP_SECURE` | boolean | No | Use SSL/TLS (default: false) |
| `SMTP_FROM_EMAIL` | string | Yes (if email flows enabled) | Sender email address |
| `SMTP_FROM_NAME` | string | No | Sender name (default: Application) |
| `SMTP_USER` | string | No | SMTP username (if auth required) |
| `SMTP_PASSWORD` | string | No | SMTP password (if auth required) |

### Observability

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ENABLE_PGAUDIT` | boolean | `false` | Enable PostgreSQL audit extension |
| `GRAFANA_ADMIN_USER` | string | `admin` | Grafana admin username |
| `GRAFANA_ADMIN_PASSWORD` | string | - | Grafana admin password (required if audit UI enabled) |

## Production Requirements

### Required in Production

- `JWT_ACCESS_TOKEN_SECRET` - Not a placeholder, min 32 chars
- `JWT_REFRESH_TOKEN_SECRET` - Not a placeholder, min 32 chars, different from access
- `REDIS_PASSWORD` - Min 16 chars base64url
- `FRONTEND_URL` - Must use HTTPS
- `SWAGGER_ENABLED` - Must be `false`

### Recommended in Production

- `DB_PASSWORD` - Strong password
- `REDIS_PASSWORD` - Strong password
- `ALLOWED_FILE_TYPES` - Explicit list, not wildcard
- `CORS_ORIGINS` - Explicit allowlist, not wildcard
- `LOG_FORMAT` - `json` for log aggregation
- `LOG_LEVEL` - `info` or `warn`

## Example .env.dev

```env
# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
LOG_FORMAT=pretty
FRONTEND_URL=http://localhost:4200
CORS_ORIGINS=http://localhost:4200

# Database
DB_HOST=postgres_db
DB_PORT=5432
DB_USERNAME=dev_user
DB_PASSWORD=dev_password
DB_DATABASE=dev_database
DB_POOL_SIZE=10

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
APP_CACHE_PREFIX=nestjs-dev

# JWT
JWT_ACCESS_TOKEN_SECRET=<generate-64-char-random>
JWT_REFRESH_TOKEN_SECRET=<generate-different-64-char-random>
JWT_ACCESS_TOKEN_EXPIRATION=15m
JWT_REFRESH_TOKEN_EXPIRATION=7d

# Swagger
SWAGGER_ENABLED=true
SWAGGER_USERNAME=local-docs
SWAGGER_PASSWORD=<min-16-chars>

# Feature Flags
ENABLE_FLASH_CARDS=true
ENABLE_COLLECTIONS=true
ENABLE_TOPICS=true
ENABLE_CHECKIN=true
ENABLE_COMMENTS=true
ENABLE_FLASH_CARD_STATES=true
ENABLE_METRICS=true
ENABLE_S3=false
ENABLE_GOOGLE_OAUTH=false
ENABLE_ACCOUNT_EMAIL_FLOWS=false
```

## Example .env.prod

```env
# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
LOG_FORMAT=json
FRONTEND_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com
TRUST_PROXY_HOPS=1

# Database
DB_HOST=postgres_db
DB_PORT=5432
DB_USERNAME=prod_user
DB_PASSWORD=<strong-production-password>
DB_DATABASE=prod_database
DB_POOL_SIZE=20
DB_CONNECTION_TIMEOUT_MS=5000
DB_QUERY_TIMEOUT_MS=15000

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<strong-16-char-base64url>
REDIS_DB=0
APP_CACHE_PREFIX=nestjs-prod

# JWT
JWT_ACCESS_TOKEN_SECRET=<production-secret-64-char>
JWT_REFRESH_TOKEN_SECRET=<different-production-secret-64-char>
JWT_ACCESS_TOKEN_EXPIRATION=15m
JWT_REFRESH_TOKEN_EXPIRATION=7d

# Swagger (MUST BE FALSE)
SWAGGER_ENABLED=false

# Feature Flags (adjust per project)
ENABLE_FLASH_CARDS=false
ENABLE_COLLECTIONS=false
ENABLE_TOPICS=false
ENABLE_CHECKIN=false
ENABLE_COMMENTS=false
ENABLE_FLASH_CARD_STATES=false
ENABLE_METRICS=true
ENABLE_S3=true
ENABLE_GOOGLE_OAUTH=false
ENABLE_ACCOUNT_EMAIL_FLOWS=true
REQUIRE_VERIFIED_EMAIL=true

# AWS S3 (if enabled)
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
# Use IAM role instead of keys in production

# SMTP (if email flows enabled)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=Your App
SMTP_USER=apikey
SMTP_PASSWORD=<sendgrid-api-key>

# Observability
ENABLE_PGAUDIT=true
GRAFANA_ADMIN_PASSWORD=<strong-password>
```

## Generating Secrets

### JWT Secrets

```bash
# Generate 64-char random secret
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Redis Password

```bash
# Generate 16-char base64url password
node -e "console.log(require('crypto').randomBytes(12).toString('base64url'))"
```

## Tài liệu liên quan

- [Configuration - Overview](README.md)
- [Feature Flags](feature-flags.md)
- [Third-party Integration](third-party-integration.md)
