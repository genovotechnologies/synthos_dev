@echo off
REM Synthos MVP Docker Setup Script for Windows
REM This script sets up and runs the Synthos application in MVP mode

echo 🚀 Starting Synthos MVP Docker Setup...

REM Create necessary directories
echo 📁 Creating directories...
if not exist "backend\logs" mkdir backend\logs
if not exist "uploads" mkdir uploads
if not exist "exports" mkdir exports

REM Check if API keys are set
if "%ANTHROPIC_API_KEY%"=="" (
    echo ⚠️  Warning: ANTHROPIC_API_KEY not set. Please set it in .env.docker or environment.
    echo    Example: set ANTHROPIC_API_KEY=your-key-here
)

if "%OPENAI_API_KEY%"=="" (
    echo ⚠️  Warning: OPENAI_API_KEY not set. This is optional but recommended.
)

REM Build and start services
echo 🏗️  Building Docker images...
docker-compose -f docker-compose.mvp.yml build

echo 🚀 Starting services...
docker-compose -f docker-compose.mvp.yml up -d

REM Wait for services to be ready
echo ⏳ Waiting for services to start...
timeout /t 15 /nobreak > nul

REM Check health
echo 🔍 Checking service health...
echo Backend health:
curl -f http://localhost:8000/health || echo Backend not ready yet

echo Frontend:
curl -f http://localhost:3000 || echo Frontend not ready yet

echo.
echo ✅ Synthos MVP is starting up!
echo.
echo 🌐 Access URLs:
echo    Frontend: http://localhost:3000
echo    Backend API: http://localhost:8000
echo    API Docs: http://localhost:8000/api/docs
echo    Health Check: http://localhost:8000/health
echo    PgAdmin: http://localhost:5050 (enable with: --profile dev-tools)
echo.
echo 📋 Next steps:
echo    1. Set your API keys in environment variables
echo    2. Visit http://localhost:3000 to use the app
echo    3. Check logs with: docker-compose -f docker-compose.mvp.yml logs -f
echo.
echo 🛑 To stop: docker-compose -f docker-compose.mvp.yml down
pause
