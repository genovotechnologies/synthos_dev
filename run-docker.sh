#!/bin/bash

# Synthos MVP Docker Setup Script
# This script sets up and runs the Synthos application in MVP mode

set -e

echo "🚀 Starting Synthos MVP Docker Setup..."

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p backend/logs
mkdir -p uploads
mkdir -p exports

# Check if API keys are set
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "⚠️  Warning: ANTHROPIC_API_KEY not set. Please set it in .env.docker or export it."
    echo "   Example: export ANTHROPIC_API_KEY=your-key-here"
fi

if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  Warning: OPENAI_API_KEY not set. This is optional but recommended."
fi

# Build and start services
echo "🏗️  Building Docker images..."
docker-compose -f docker-compose.mvp.yml build

echo "🚀 Starting services..."
docker-compose -f docker-compose.mvp.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 15

# Check health
echo "🔍 Checking service health..."
echo "Backend health:"
curl -f http://localhost:8000/health || echo "Backend not ready yet"

echo "Frontend:"
curl -f http://localhost:3000 || echo "Frontend not ready yet"

echo ""
echo "✅ Synthos MVP is starting up!"
echo ""
echo "🌐 Access URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/api/docs"
echo "   Health Check: http://localhost:8000/health"
echo "   PgAdmin: http://localhost:5050 (enable with: --profile dev-tools)"
echo ""
echo "📋 Next steps:"
echo "   1. Set your API keys in environment variables"
echo "   2. Visit http://localhost:3000 to use the app"
echo "   3. Check logs with: docker-compose -f docker-compose.mvp.yml logs -f"
echo ""
echo "🛑 To stop: docker-compose -f docker-compose.mvp.yml down"
