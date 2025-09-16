@echo off
REM Synthos Local Development Setup (No Docker Required)
REM This runs the app directly with Python and Node.js

echo 🚀 Starting Synthos Local Development Setup...

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found. Please install Python 3.11+ first.
    echo    Download from: https://python.org/downloads/
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found. Please install Node.js 18+ first.
    echo    Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Python and Node.js found

REM Check API keys
if "%ANTHROPIC_API_KEY%"=="" (
    echo ⚠️  Warning: ANTHROPIC_API_KEY not set
    echo    Set it with: set ANTHROPIC_API_KEY=your-key-here
)

echo 📦 Installing backend dependencies...
cd backend
python -m pip install -r requirements.txt
if errorlevel 1 (
    echo ❌ Failed to install Python dependencies
    pause
    exit /b 1
)

echo 📦 Installing frontend dependencies...
cd ..\frontend
call npm install
if errorlevel 1 (
    echo ❌ Failed to install Node.js dependencies
    pause
    exit /b 1
)

echo 🚀 Starting services...

REM Start backend in background
cd ..\backend
start "Synthos Backend" cmd /k "set MVP_MODE=true && set ENVIRONMENT=development && set DEBUG=true && set ENABLE_CACHING=false && set DATABASE_URL=sqlite:///./synthos.db && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

REM Wait a bit for backend to start
timeout /t 5 /nobreak > nul

REM Start frontend
cd ..\frontend
echo 🌐 Starting frontend...
start "Synthos Frontend" cmd /k "set NEXT_PUBLIC_API_URL=http://localhost:8000 && npm run dev"

echo ✅ Synthos is starting up!
echo.
echo 🌐 Access URLs:
echo    Frontend: http://localhost:3000
echo    Backend API: http://localhost:8000
echo    API Docs: http://localhost:8000/api/docs
echo.
echo 📋 To stop: Close the terminal windows that opened
pause
