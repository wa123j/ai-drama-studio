@echo off
cd /d "%~dp0"
title AI Drama Studio

echo ==============================================
echo      AI Drama Studio - Starting...
echo ==============================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: Check .env
if not exist ".env" (
    echo [ERROR] .env file not found!
    echo.
    echo   Copy .env.example to .env and edit it:
    echo     copy .env.example .env
    echo.
    echo   Then open .env and set your CLAUDE_API_KEY.
    echo.
    pause
    exit /b 1
)

:: Check dependencies
if not exist "node_modules\" (
    echo [INFO] Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed. Check your network connection.
        pause
        exit /b 1
    )
)

:: Start backend API (log errors to file)
echo [1/2] Starting backend API...
del server-error.log 2>nul
start "AI-Studio-Backend" /min cmd /c "node server/index.js >nul 2>server-error.log"

:: Wait for backend to start
timeout /t 3 /nobreak >nul

:: Check if backend started successfully
if exist server-error.log (
    for %%? in (server-error.log) do if %%~z? neq 0 (
        echo [ERROR] Backend failed to start!
        echo   Check server-error.log for details:
        type server-error.log
        echo.
        pause
        exit /b 1
    )
)

:: Check if port 3001 is listening
netstat -ano | findstr :3001 | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo [ERROR] Backend did not start on port 3001.
    echo   Check server-error.log for details.
    if exist server-error.log type server-error.log
    pause
    exit /b 1
)

:: Start frontend dev server
echo [2/2] Starting frontend...
echo.
echo ==============================================
echo   Backend API: http://localhost:3001
echo   Frontend:    http://localhost:5173
echo   Press Ctrl+C to stop frontend
echo ==============================================
npx vite --host

echo.
echo Frontend stopped. Press any key to exit...
pause
