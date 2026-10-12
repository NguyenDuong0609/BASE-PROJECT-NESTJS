@echo off
echo ===================================================
echo   Starting NestJS Production Environment (Full Stack)
echo ===================================================
echo.

echo Step 1: Validating production configuration...
docker compose --env-file .env.prod -f docker-compose.prod.yml -f docker-compose.audit.yml --profile audit-ui config --quiet
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Configuration validation failed! Check .env.prod.
    pause
    exit /b 1
)

echo.
echo Step 2: Building and starting production containers...
docker compose --env-file .env.prod -f docker-compose.prod.yml -f docker-compose.audit.yml --profile audit-ui up -d --build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to start containers!
    pause
    exit /b 1
)

echo.
echo Step 3: Waiting 20 seconds for services to initialize...
timeout /t 20 /nobreak >nul

echo.
echo Step 4: Checking container status...
docker compose --env-file .env.prod -f docker-compose.prod.yml -f docker-compose.audit.yml --profile audit-ui ps

echo.
echo Step 5: Testing API health endpoint...
curl -i http://localhost:3000/health/live

echo.
echo ===================================================
echo   Production Environment Ready!
echo ===================================================
echo.
echo Services running:
echo - API:          http://localhost:3000
echo - Health:       http://localhost:3000/health/live  ^|  /health/ready
echo - Metrics:      http://localhost:3000/metrics
echo - PostgreSQL:   postgres_db:5432 (internal)
echo - Redis:        redis:6379 (internal)
echo - RedisInsight: http://localhost:5540  (Visual Redis Cache UI)
echo - Grafana:      http://localhost:3001  (admin / see GRAFANA_ADMIN_PASSWORD in .env.prod)
echo.
echo Grafana Dashboards (pre-configured):
echo - NestJS API Metrics
echo - Redis & Cache Performance (RAM, CPU, Cache Hit/Miss)
echo - NestJS API Audit Logs
echo - NestJS API Application Logs
echo.
echo View logs: docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f api
echo Stop services: npm run docker:prod:remove
echo.
pause
