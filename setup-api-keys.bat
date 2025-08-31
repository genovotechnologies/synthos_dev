@echo off
echo ===========================================
echo    Synthos MVP - API Keys Setup
echo ===========================================
echo.

echo To set up your API keys, you have three options:
echo.

echo 1. Set environment variables in this terminal session:
echo    set ANTHROPIC_API_KEY=your-actual-anthropic-key
echo    set OPENAI_API_KEY=your-actual-openai-key
echo.

echo 2. Create a .env file in the project root:
echo    ANTHROPIC_API_KEY=your-actual-anthropic-key
echo    OPENAI_API_KEY=your-actual-openai-key
echo.

echo 3. Add them to your system environment variables
echo.

echo ===========================================
echo After setting your keys, restart the services:
echo    docker-compose -f docker-compose.mvp.yml down
echo    docker-compose -f docker-compose.mvp.yml up -d
echo ===========================================
echo.
pause
