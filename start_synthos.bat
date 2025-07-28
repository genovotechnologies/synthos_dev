@echo off
setlocal enabledelayedexpansion

echo 🚀 Starting Synthos Development Environment...
echo ==============================================

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed. Please install npm
    exit /b 1
)

REM Check if Python is installed
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed. Please install Python 3.8+
    exit /b 1
)

echo [SUCCESS] All dependencies are installed

REM Test backend startup
echo [INFO] Testing backend startup...
cd backend
python test_startup.py
if %errorlevel% neq 0 (
    echo [ERROR] Backend startup failed
    exit /b 1
)
echo [SUCCESS] Backend imports and app creation successful
cd ..

REM Install frontend dependencies
echo [INFO] Installing frontend dependencies...
cd frontend
npm install
if %errorlevel% neq 0 (
    echo [ERROR] Frontend dependency installation failed
    exit /b 1
)
echo [SUCCESS] Frontend dependencies installed
cd ..

REM Start backend in background
echo [INFO] Starting backend server...
cd backend
start "Synthos Backend" cmd /c "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
cd ..

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
echo [INFO] Starting frontend development server...
cd frontend
start "Synthos Frontend" cmd /c "npm run dev"
cd ..

echo ==============================================
echo [SUCCESS] Synthos is starting up!
echo [INFO] Backend: http://localhost:8000
echo [INFO] Frontend: http://localhost:3000
echo [INFO] Health Check: http://localhost:8000/health
echo ==============================================
echo [INFO] Press any key to stop all servers
echo.

pause >nul

REM Cleanup - kill the background processes
taskkill /f /im node.exe >nul 2>nul
taskkill /f /im python.exe >nul 2>nul

echo [SUCCESS] Servers stopped 