@echo off
echo ================================================
echo   Starting NestJS Development Environment
echo ================================================
echo.

echo [1/3] Starting Infrastructure (PostgreSQL + Redis)...
docker compose --env-file .env.dev -f docker-compose-infrastructure.yml up -d

echo.
echo [2/3] Waiting for services to be healthy...
timeout /t 10 /nobreak >nul

echo.
echo [3/3] Services Status:
docker compose -f docker-compose-infrastructure.yml ps

echo.
echo ================================================
echo   Infrastructure Ready!
echo ================================================
echo.
echo Next steps:
echo   1. Run migrations: npm run migration:run
echo   2. Start app: npm run start:dev
echo   3. Access: http://localhost:3000
echo.
echo To stop: npm run docker:infra:down
echo.
pause
