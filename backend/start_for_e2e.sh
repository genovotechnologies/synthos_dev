#!/bin/bash

# =============================================================================
# SYNTHOS BACKEND E2E STARTUP SCRIPT
# Handles backend startup for E2E testing with minimal dependencies
# =============================================================================

set -e

echo "🚀 Starting Synthos Backend for E2E Testing..."

# Install minimal dependencies
echo "📦 Installing minimal dependencies..."
pip install -r requirements-minimal.txt

# Set up environment
echo "⚙️ Setting up environment..."
cp .env.example .env
echo "DATABASE_URL=postgresql://synthos:password@localhost:5432/synthos" >> .env
echo "REDIS_URL=redis://localhost:6379/0" >> .env
echo "ANTHROPIC_API_KEY=test-key" >> .env
echo "SECRET_KEY=test-secret-key-for-e2e" >> .env

# Run database migrations
echo "🗄️ Running database migrations..."
alembic upgrade head

# Start the server
echo "🌐 Starting FastAPI server..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &

# Wait for server to be ready
echo "⏳ Waiting for server to be ready..."
sleep 5

# Check if server is running
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend server is running successfully!"
else
    echo "❌ Backend server failed to start"
    exit 1
fi

echo "🎯 Backend ready for E2E testing!" 