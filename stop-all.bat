@echo off
title Stop novoli Services
cls
echo ========================================================
echo                 STOPPING novoli SERVICES                
echo ========================================================
echo.

echo [1/3] Stopping Frontend and Backend (Node.js processes)...
taskkill /F /IM node.exe 2>nul

echo [2/3] Stopping Redis...
taskkill /F /IM redis-server.exe 2>nul

echo [3/3] Stopping PostgreSQL...
"C:\Users\Hue\tools\pgsql\bin\pg_ctl.exe" -D "C:\Users\Hue\tools\pgsql\data" stop 2>nul
taskkill /F /IM postgres.exe 2>nul

echo.
echo ========================================================
echo        All novoli services stopped successfully!
echo ========================================================
echo.
pause
