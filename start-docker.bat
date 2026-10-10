@echo off
echo ===================================
echo   Starting Full Docker Environment
echo ===================================
echo.

echo Step 1: Cleaning up existing containers...
docker compose -f docker-compose.dev.yml down -v

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
echo Step 3: Starting all containers...
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d

echo.
echo Step 4: Waiting 20 seconds for services to start...
timeout /t 20 /nobreak

echo.
echo Step 5: Checking container status...
docker compose -f docker-compose.dev.yml ps

echo.
echo Step 6: Testing API health endpoint...
curl http://localhost:3000/health/live

echo.
echo ===================================
echo   Setup Complete!
echo ===================================
echo.
echo Services running:
echo - API: http://localhost:3000
echo - PostgreSQL: localhost:5433
echo - Redis: localhost:6379
echo.
echo View logs: npm run docker:dev:logs
echo Stop services: npm run docker:dev:down
echo.
pause
