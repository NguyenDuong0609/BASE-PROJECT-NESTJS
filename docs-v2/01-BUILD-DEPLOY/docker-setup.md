# Docker Setup

Hướng dẫn thiết lập và sử dụng Docker cho development, staging và production.

## Tổng quan

Dự án sử dụng Docker Compose để:

- **Development**: Chạy PostgreSQL và Redis trong containers
- **Staging/Production**: Chạy toàn bộ stack trong containers
- **Consistency**: Đảm bảo môi trường nhất quán

## File Compose

| File | Mục đích |
|------|----------|
| `docker-compose.dev.yml` | Development (PostgreSQL, Redis) |
| `docker-compose.prod.yml` | Production (full stack) |
| `docker-compose.audit.yml` | Observability stack (Grafana, Loki, Alloy) |

## Development Docker

### Bắt đầu

```powershell
# Khởi động PostgreSQL và Redis
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d postgres_db redis
```

### Kiểm tra trạng thái

```powershell
docker compose -f docker-compose.dev.yml ps
```

Kết quả:
```
NAME           STATUS          PORTS
postgres_db    Up (healthy)    0.0.0.0:5433->5432/tcp
redis          Up (healthy)    0.0.0.0:6379->6379/tcp
```

### Xem logs

```powershell
# Tất cả services
docker compose -f docker-compose.dev.yml logs -f

# Chỉ PostgreSQL
docker logs postgres_db -f

# Chỉ Redis
docker logs redis -f
```

### Dừng services

```powershell
# Dừng và giữ data
docker compose -f docker-compose.dev.yml down

# Dừng và xóa data
docker compose -f docker-compose.dev.yml down -v
```

## Production Docker

### Yêu cầu

- File `.env.prod` với secrets thật
- Docker Compose v2
- TLS termination (nginx/traefik) trước API

### Build và deploy

```powershell
# Validate config
docker compose --env-file .env.prod -f docker-compose.prod.yml config --quiet

# Build images
docker compose --env-file .env.prod -f docker-compose.prod.yml build

# Start (không publish ports ra ngoài)
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

### Với Observability Stack

```powershell
docker compose --env-file .env.prod --profile audit-ui \
  -f docker-compose.prod.yml -f docker-compose.audit.yml up -d --build
```

### Kiểm tra health

```powershell
# Container status
docker compose -f docker-compose.prod.yml ps

# API health check
curl http://localhost:3000/health/ready
```

## Docker Compose Structure

### Development Compose

```yaml
services:
  postgres_db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${DB_DATABASE}
      POSTGRES_USER: ${DB_USERNAME}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5433:5432"  # Expose ra host
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USERNAME}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"  # Expose ra host
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

### Production Compose

```yaml
services:
  postgres_db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${DB_DATABASE}
      POSTGRES_USER: ${DB_USERNAME}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    # KHÔNG expose ports ra ngoài
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USERNAME}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    # KHÔNG expose ports ra ngoài
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  migrate:
    image: ${APP_IMAGE}:${APP_VERSION}
    command: ["npm", "run", "migration:run"]
    environment:
      NODE_ENV: production
      # ... các env vars khác
    depends_on:
      postgres_db:
        condition: service_healthy

  api:
    image: ${APP_IMAGE}:${APP_VERSION}
    environment:
      NODE_ENV: production
      # ... các env vars khác
    depends_on:
      postgres_db:
        condition: service_healthy
      redis:
        condition: service_healthy
      migrate:
        condition: service_completed_successfully
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health/ready"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  postgres_data:
  redis_data:
```

## Network Configuration

### Development

```yaml
networks:
  default:
    name: flash_cards_dev
```

- Services giao tiếp với nhau qua service name
- PostgreSQL: `postgres_db:5432`
- Redis: `redis:6379`

### Production

```yaml
networks:
  default:
    name: flash_cards_prod
    internal: true  # Chỉ giao tiếp nội bộ
```

- Không expose ports ra Internet
- Chỉ bind API vào loopback
- Dùng reverse proxy ở ngoài

## Volume Management

### Development volumes

```powershell
# List volumes
docker volume ls

# Inspect volume
docker volume inspect nguyenduong864-beep-shiny-couscous_postgres_data

# Delete volume (CAUTION: mất data)
docker volume rm nguyenduong864-beep-shiny-couscous_postgres_data
```

### Production volumes

Volumes production cần:
- Regular backup
- Encryption
- Monitoring capacity
- Retention policy

## Multi-stage Dockerfile

### Stage 1: Build

```dockerfile
FROM node:24-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
```

### Stage 2: Production

```dockerfile
FROM node:24-alpine AS production

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /usr/src/app/dist ./dist

# Non-root user
USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

## Environment Variables trong Docker

### Development

```powershell
# Compose đọc từ .env.dev
docker compose --env-file .env.dev -f docker-compose.dev.yml up
```

### Production

```powershell
# Compose đọc từ .env.prod
docker compose --env-file .env.prod -f docker-compose.prod.yml up
```

**Quan trọng:**
- Không commit `.env.prod`
- Sử dụng secret manager
- Truyền secrets qua environment

## Health Checks

### API Health Check

```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health/ready"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### PostgreSQL Health Check

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ${DB_USERNAME}"]
  interval: 10s
  timeout: 5s
  retries: 5
```

### Redis Health Check

```yaml
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 10s
  timeout: 5s
  retries: 5
```

## Resource Limits

### Production limits

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G

  postgres_db:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## Troubleshooting

### Container không khởi động

```powershell
# Xem logs
docker compose -f docker-compose.dev.yml logs api

# Kiểm tra container status
docker compose -f docker-compose.dev.yml ps

# Restart service
docker compose -f docker-compose.dev.yml restart api
```

### Database connection error

```powershell
# Kiểm tra PostgreSQL health
docker logs postgres_db

# Verify env vars
docker exec api env | grep DB_

# Test connection từ container
docker exec api sh -c "nc -z postgres_db 5432"
```

### Out of disk space

```powershell
# Cleanup unused images
docker system prune -a

# Cleanup volumes (CAUTION)
docker volume prune
```

### Port conflict

```powershell
# Tìm process đang dùng port
netstat -ano | findstr ":3000"

# Đổi port trong .env
PORT=3001
```

## Best Practices

1. **Không dùng tag `latest`** - Dùng version cụ thể
2. **Non-root user** - Chạy container với user non-root
3. **Minimal layers** - Gộp commands trong Dockerfile
4. **Health checks** - Luôn có health check
5. **Resource limits** - Set limits trong production
6. **Secrets management** - Không hardcode secrets
7. **Immutable infrastructure** - Không sửa running containers

## Tài liệu liên quan

- [Local Development](local-development.md)
- [Production Deploy](production-deploy.md)
- [Configuration](../05-CAU-HINH/environment-variables.md)
