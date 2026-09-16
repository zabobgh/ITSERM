@echo off
setlocal enabledelayedexpansion
title NBK-OCC Agricultural Health Screening Server

set PORT=29841
if not "%~1"=="" set PORT=%~1

echo ========================================================================
echo   NBK-OCC Agricultural Screening System (Go Backend + Vue 3 Frontend)
echo ========================================================================
echo [*] Target Port: %PORT%
echo.

REM 1. Kill any existing nbk-server.exe process
echo [*] Checking and terminating previous nbk-server instances...
taskkill /F /IM nbk-server.exe >nul 2>&1

REM 2. Kill any process listening on the target port
echo [*] Checking and terminating processes on port %PORT%...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r /c:":%PORT% *LISTENING"') do (
    if not "%%a"=="0" (
        echo     - Terminating conflicting PID: %%a on port %PORT%
        taskkill /F /PID %%a >nul 2>&1
    )
)

REM 3. Resolve directory and navigate to backend
set "BASE_DIR=%~dp0"
if exist "%BASE_DIR%backend\main.go" (
    cd /d "%BASE_DIR%backend"
) else if exist "%BASE_DIR%nbk-occ-system\backend\main.go" (
    cd /d "%BASE_DIR%nbk-occ-system\backend"
) else (
    cd /d "%BASE_DIR%"
)

REM 4. Check if binary exists, compile if needed
if not exist "nbk-server.exe" (
    echo [*] Binary nbk-server.exe not found, compiling with Go...
    go build -o nbk-server.exe main.go
    if errorlevel 1 (
        echo [ERROR] Failed to compile Go backend.
        pause
        exit /b 1
    )
)

REM 5. Automatically open browser
echo [*] Opening default web browser to http://localhost:%PORT%
start "" "http://localhost:%PORT%"

echo.
echo ========================================================================
echo   Server is active and listening at: http://localhost:%PORT%
echo   Press Ctrl+C to terminate the server.
echo ========================================================================
echo.

REM 6. Run server
set PORT=%PORT%
nbk-server.exe

pause
