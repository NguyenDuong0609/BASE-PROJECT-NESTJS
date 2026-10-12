@echo off
echo ===================================
echo   Starting Full Docker Environment
echo ===================================
echo.

echo Step 1: Cleaning up existing containers...
docker compose --env-file .env.dev -f docker-compose.dev.yml --profile monitoring down -v

echo.
echo Step 2: Building Docker image (this takes 2-3 minutes)...
docker compose --env-file .env.dev -f docker-compose.dev.yml build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo Step 3: Starting all containers (with monitoring)...
docker compose --env-file .env.dev -f docker-compose.dev.yml --profile monitoring up -d

echo.
echo Step 4: Waiting 20 seconds for services to start...
timeout /t 20 /nobreak

echo.
echo Step 5: Checking container status...
docker compose --env-file .env.dev -f docker-compose.dev.yml --profile monitoring ps

echo.
echo Step 6: Testing API health endpoint...
curl http://localhost:3317/health/live

echo.
echo ===================================
echo   Setup Complete!
echo ===================================
echo.
echo Services running:
echo - API:          http://localhost:3317
echo - Swagger:      http://localhost:3317/api-docs
echo - PostgreSQL:   localhost:3533
echo - Redis:        localhost:6379
echo - RedisInsight: http://localhost:5540  (Visual Redis Cache UI)
echo - Grafana:      http://localhost:3001  (admin / see GRAFANA_ADMIN_PASSWORD in .env.dev)
echo - Prometheus:   http://localhost:9090  (internal)
echo.
echo Grafana Dashboards (pre-configured):
echo - NestJS API Metrics
echo - NestJS API Audit Logs
echo - NestJS API Application Logs
echo - Redis & Cache Performance (RAM, CPU, Cache Hit/Miss)
echo.
echo View logs: docker compose -f docker-compose.dev.yml logs -f
echo Stop services: npm run docker:dev:down
echo.
pause
