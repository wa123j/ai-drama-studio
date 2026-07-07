@echo off
cd /d "%~dp0"
title AI Drama Studio - Stop

echo ========================================
echo     AI Drama Studio - Stopping...
echo ========================================
echo.

:: Kill backend (port 3001)
echo [1/2] Stopping backend (port 3001)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /f /pid %%a >nul 2>nul
    echo   [OK] Backend stopped
)

:: Kill frontend (port 5173)
echo [2/2] Stopping frontend (port 5173)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
    taskkill /f /pid %%a >nul 2>nul
    echo   [OK] Frontend stopped
)

echo.
echo ========================================
echo     All services stopped.
echo ========================================
pause
