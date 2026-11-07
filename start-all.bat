@echo off
setlocal
title novoli Launcher
set "ROOT_DIR=%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    echo Node.js is required. Install Node.js 22 or later, then run this file again.
    pause
    exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
    echo npm is required. Reinstall Node.js with npm, then run this file again.
    pause
    exit /b 1
)
where docker >nul 2>nul
if errorlevel 1 (
    echo Docker Desktop is required to start PostgreSQL and Redis.
    pause
    exit /b 1
)

if not exist "%ROOT_DIR%backend\.env" (
    copy "%ROOT_DIR%backend\.env.example" "%ROOT_DIR%backend\.env" >nul
    if errorlevel 1 goto failed
    echo Created backend\.env from the example. Review it before production use.
)

echo Starting PostgreSQL and Redis...
pushd "%ROOT_DIR%"
docker compose up -d postgres redis
if errorlevel 1 (
    popd
    goto failed
)
popd

if not exist "%ROOT_DIR%backend\node_modules" (
    echo Installing backend dependencies...
    pushd "%ROOT_DIR%backend"
    call npm ci
    if errorlevel 1 (
        popd
        goto failed
    )
    popd
)

if not exist "%ROOT_DIR%frontend\node_modules" (
    echo Installing frontend dependencies...
    pushd "%ROOT_DIR%frontend"
    call npm ci
    if errorlevel 1 (
        popd
        goto failed
    )
    popd
)

echo Applying database migrations...
pushd "%ROOT_DIR%backend"
call npx prisma generate
if errorlevel 1 (
    popd
    goto failed
)
call npx prisma migrate deploy
if errorlevel 1 (
    popd
    goto failed
)
popd

echo Starting the Noveli backend and frontend...
start "Noveli Backend" /D "%ROOT_DIR%backend" cmd /k "npm run dev"
start "Noveli Frontend" /D "%ROOT_DIR%frontend" cmd /k "npm run dev"
timeout /t 4 /nobreak >nul
start "" "http://localhost:3000"
echo.
echo Noveli is starting at http://localhost:3000
echo Backend health check: http://localhost:4000/health
exit /b 0

:failed
echo.
echo Noveli could not start. Review the error above, then try again.
pause
exit /b 1
