# Production Deploy

Hướng dẫn triển khai dự án lên môi trường production.

## Yêu cầu trước khi deploy

### Checklist

- [ ] Tất cả tests pass (unit + e2e)
- [ ] Lint pass
- [ ] Build thành công
- [ ] Migration đã review
- [ ] Secrets đã cấu hình
- [ ] Database backup plan sẵn sàng
- [ ] Monitoring/alerting đã setup
- [ ] Staging đã test thành công
- [ ] Rollback plan đã chuẩn bị

### Server requirements

- **OS**: Linux (Ubuntu 22.04+ recommended)
- **Docker**: Engine 20.10+, Compose v2
- **CPU**: 4 cores minimum
- **RAM**: 8GB minimum
- **Disk**: 50GB SSD minimum
- **TLS Certificate**: Valid SSL certificate

## 1. Chuẩn bị Environment

### Tạo .env.prod

```powershell
# Copy từ .env.example
cp .env.example .env.prod
```

**Cấu hình bắt buộc:**

```env
NODE_ENV=production
PORT=3000

# Database
DB_HOST=postgres_db
DB_PORT=5432
DB_USERNAME=production_user
DB_PASSWORD=<strong-password-min-16-chars>
DB_DATABASE=production_db
DB_POOL_SIZE=20
DB_CONNECTION_TIMEOUT_MS=5000
DB_QUERY_TIMEOUT_MS=15000

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<strong-password-min-16-chars-base64url>
REDIS_DB=0

# JWT secrets (phải khác nhau, ngẫu nhiên, >= 32 chars)
JWT_ACCESS_TOKEN_SECRET=<generate-random-64-char>
JWT_REFRESH_TOKEN_SECRET=<generate-another-random-64-char>
JWT_ACCESS_TOKEN_EXPIRATION=15m
JWT_REFRESH_TOKEN_EXPIRATION=7d

# Frontend
FRONTEND_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com

# Log
LOG_LEVEL=info
LOG_FORMAT=json

# Security
TRUST_PROXY_HOPS=1

# Feature flags (tùy chỉnh theo dự án)
ENABLE_FLASH_CARDS=false
ENABLE_COLLECTIONS=false
ENABLE_TOPICS=false
ENABLE_CHECKIN=false
ENABLE_COMMENTS=false
ENABLE_FLASH_CARD_STATES=false
ENABLE_STUDENT_CARD_UPLOADS=false
ENABLE_METRICS=true
ENABLE_ACCOUNT_EMAIL_FLOWS=false
REQUIRE_VERIFIED_EMAIL=false
ENABLE_S3=false
ENABLE_GOOGLE_OAUTH=false

# Swagger (PHẢI tắt trong production)
SWAGGER_ENABLED=false
```

**Tạo secrets:**

```bash
# JWT secrets
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# Redis password
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

### File permissions

```bash
chmod 600 .env.prod
```

## 2. Build Docker Images

### Option 1: Build local và push

```bash
# Tag với commit SHA
docker build -t registry.example.com/nestjs-base:${CI_COMMIT_SHA} .

# Push
docker push registry.example.com/nestjs-base:${CI_COMMIT_SHA}
```

### Option 2: Build trên server

```bash
# Pull code
git clone <repository-url>
cd nguyenduong864-beep-shiny-couscous
git checkout <tag-or-branch>

# Build
docker compose --env-file .env.prod -f docker-compose.prod.yml build
```

## 3. Deploy với Docker Compose

### Deploy full stack

```bash
# Validate config
docker compose --env-file .env.prod -f docker-compose.prod.yml config --quiet

# Build
docker compose --env-file .env.prod -f docker-compose.prod.yml build

# Deploy
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

### Deploy với observability

```bash
docker compose --env-file .env.prod --profile audit-ui \
  -f docker-compose.prod.yml -f docker-compose.audit.yml up -d --build
```

### Kiểm tra deployment

```bash
# Container status
docker compose -f docker-compose.prod.yml ps

# API health
curl http://localhost:3000/health/ready

# View logs
docker compose -f docker-compose.prod.yml logs -f api
```

## 4. Database Migration

Migration chạy tự động trước khi API start:

```yaml
services:
  migrate:
    image: ${APP_IMAGE}:${APP_VERSION}
    command: ["npm", "run", "migration:run"]
    depends_on:
      postgres_db:
        condition: service_healthy

  api:
    depends_on:
      migrate:
        condition: service_completed_successfully
```

### Manual migration (nếu cần)

```bash
docker compose -f docker-compose.prod.yml exec api npm run migration:run
```

## 5. Reverse Proxy Setup

### Nginx configuration

```nginx
upstream nestjs_api {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/ssl/certs/yourdomain.com.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.com.key;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    location / {
        proxy_pass http://nestjs_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Metrics endpoint (private)
    location /metrics {
        allow 127.0.0.1;
        allow 10.0.0.0/8;
        deny all;
        proxy_pass http://nestjs_api;
    }
}
```

## 6. Backup Strategy

### PostgreSQL backup

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
docker compose -f docker-compose.prod.yml exec -T postgres_db pg_dump -U ${DB_USERNAME} ${DB_DATABASE} > ${BACKUP_DIR}/backup_${DATE}.sql

# Compress
gzip ${BACKUP_DIR}/backup_${DATE}.sql

# Retention: keep 30 days
find ${BACKUP_DIR} -name "backup_*.sql.gz" -mtime +30 -delete
```

### Cron job

```bash
# /etc/cron.d/postgres-backup
0 2 * * * root /scripts/postgres-backup.sh
```

## 7. Monitoring

### Health checks

```bash
# Add to monitoring system
curl -f http://localhost:3000/health/live || alert
curl -f http://localhost:3000/health/ready || alert
```

### Log aggregation

Logs từ containers nên được gửi đến:
- Grafana Loki
- ELK Stack
- CloudWatch Logs
- Datadog

### Metrics

Prometheus metrics ở `/metrics` (nếu `ENABLE_METRICS=true`)

## 8. Rolling Update

### Zero-downtime update

```bash
# Pull new image
docker pull registry.example.com/nestjs-base:${NEW_VERSION}

# Update specific service
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d api

# Wait for health check
while ! curl -f http://localhost:3000/health/ready; do
    sleep 5
done
```

### Blue-green deployment

```bash
# Deploy to green
export COMPOSE_PROJECT_NAME=nestjs-green
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d

# Switch nginx upstream
# Then shutdown blue
export COMPOSE_PROJECT_NAME=nestjs-blue
docker compose --env-file .env.prod -f docker-compose.prod.yml down
```

## 9. Rollback

### Rollback to previous version

```bash
# Set previous version
export APP_VERSION=<previous-commit-sha>

# Redeploy
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --remove-orphans

# Wait for health
curl -f http://localhost:3000/health/ready
```

### Database rollback

```bash
# Revert migration (CAUTION: test on staging first)
docker compose -f docker-compose.prod.yml exec api npm run migration:revert
```

## 10. Security Checklist

- [ ] Firewall configured (allow only necessary ports)
- [ ] SSH keys only, no password auth
- [ ] Docker daemon secured
- [ ] Secrets not in image
- [ ] Non-root containers
- [ ] Resource limits set
- [ ] TLS/SSL configured
- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] Input validation enabled
- [ ] Regular security updates
- [ ] Audit logging enabled

## 11. Performance Tuning

### PostgreSQL tuning

```env
# In postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 1310kB
min_wal_size = 1GB
max_wal_size = 4GB
```

### Node.js tuning

```env
NODE_OPTIONS=--max-old-space-size=2048
```

### Docker resource limits

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

## 12. Troubleshooting

### Container không healthy

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs api

# Check resource usage
docker stats

# Restart
docker compose -f docker-compose.prod.yml restart api
```

### Database connection failed

```bash
# Check PostgreSQL
docker compose -f docker-compose.prod.yml logs postgres_db

# Test connection
docker compose -f docker-compose.prod.yml exec api sh -c "nc -z postgres_db 5432"
```

### High memory usage

```bash
# Check container memory
docker stats

# Increase limits in docker-compose.prod.yml
```

## Tài liệu liên quan

- [Docker Setup](docker-setup.md)
- [CI/CD Pipeline](ci-cd-pipeline.md)
- [Configuration](../05-CAU-HINH/environment-variables.md)
- [Observability](../06-OBSERVABILITY/)
