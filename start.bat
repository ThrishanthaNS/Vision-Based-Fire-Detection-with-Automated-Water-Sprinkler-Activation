@echo off
title FireGuard AI - Startup
color 0A

echo.
echo  ============================================
echo   FIREGUARD AI - Intelligent Fire Detection
echo  ============================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Install Python 3.10+ and add it to PATH.
    pause
    exit /b 1
)

:: Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

:: Setup backend venv if needed
if not exist "backend\venv\Scripts\activate.bat" (
    echo [SETUP] Creating Python virtual environment...
    cd backend
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
    cd ..
) else (
    echo [OK] Python virtual environment found.
)

:: Copy .env if not exists
if not exist "backend\.env" (
    echo [SETUP] Creating backend .env from template...
    copy "backend\.env.example" "backend\.env"
    echo [NOTE] Edit backend\.env to configure your hardware settings.
)

:: Start backend in new window
echo.
echo [START] Starting FastAPI backend on http://localhost:8000 ...
start "FireGuard Backend" cmd /k "cd backend && venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

:: Wait a moment for backend to initialize
timeout /t 3 /nobreak >nul

:: Install frontend deps if needed
if not exist "frontend\node_modules" (
    echo [SETUP] Installing frontend dependencies...
    cd frontend
    npm install
    cd ..
)

:: Start frontend in new window
echo [START] Starting React frontend on http://localhost:3000 ...
start "FireGuard Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo  ============================================
echo   Both servers are starting in new windows.
echo   Open http://localhost:3000 in your browser.
echo  ============================================
echo.
pause

