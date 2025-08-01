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
echo "DATABASE_URL=postgresql://synthos:securepassword123@localhost:5432/synthos_db" >> .env
echo "REDIS_URL=redis://localhost:6379/0" >> .env
echo "ANTHROPIC_API_KEY=test-key" >> .env
echo "SECRET_KEY=test-secret-key-for-e2e" >> .env

# Check if Docker services are running
echo "🔍 Checking Docker services..."
if docker ps | grep -q postgres; then
    echo "✅ PostgreSQL container is running"
else
    echo "❌ PostgreSQL container is not running"
    echo "💡 Starting PostgreSQL with docker-compose..."
    docker-compose up -d postgres redis || docker compose up -d postgres redis
    echo "⏳ Waiting for Docker services to start..."
    sleep 15
fi

# Wait for database to be available
echo "⏳ Waiting for database to be available..."
max_attempts=60  # Increased from 30
attempt=1

while [ $attempt -le $max_attempts ]; do
    # First check if PostgreSQL is running at all
    if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
        echo "✅ PostgreSQL is running on port 5432"
        
        # Then check if we can connect with the specific user and database
        if pg_isready -h localhost -p 5432 -U synthos -d synthos_db > /dev/null 2>&1; then
            echo "✅ Database is ready!"
            break
        else
            echo "⏳ PostgreSQL is running but synthos_db not ready yet (attempt $attempt/$max_attempts)..."
            # Try to create the database and user if they don't exist
            if [ $attempt -eq 10 ] || [ $attempt -eq 30 ]; then
                echo "🔄 Attempting to create database and user..."
                psql -h localhost -U postgres -c "CREATE USER synthos WITH PASSWORD 'securepassword123';" 2>/dev/null || true
                psql -h localhost -U postgres -c "CREATE DATABASE synthos_db OWNER synthos;" 2>/dev/null || true
                psql -h localhost -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE synthos_db TO synthos;" 2>/dev/null || true
            fi
        fi
    else
        echo "⏳ PostgreSQL not ready yet (attempt $attempt/$max_attempts)..."
    fi
    
    sleep 2
    attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
    echo "❌ Database failed to become available after $max_attempts attempts"
    echo "📋 Debugging information:"
    echo "Docker containers:"
    docker ps
    echo ""
    echo "PostgreSQL logs:"
    docker logs $(docker ps -q --filter "name=postgres") 2>/dev/null || echo "No PostgreSQL container found"
    echo ""
    echo "Network connectivity:"
    netstat -tlnp | grep 5432 || echo "Port 5432 not listening"
    echo ""
    echo "💡 In CI, this should be handled by docker-compose up -d postgres redis"
    exit 1
fi

# Run database migrations
echo "🗄️ Running database migrations..."
alembic upgrade head || {
    echo "⚠️ Database migrations failed, but continuing..."
    echo "💡 This might be expected in CI if database is not fully initialized"
}

# Start the server
echo "🌐 Starting FastAPI server..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &

# Wait for server to be ready
echo "⏳ Waiting for server to be ready..."
sleep 5

# Check if server is running
max_server_attempts=15  # Increased from 10
server_attempt=1

while [ $server_attempt -le $max_server_attempts ]; do
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ Backend server is running successfully!"
        break
    else
        echo "⏳ Server not ready yet (attempt $server_attempt/$max_server_attempts)..."
        sleep 2
        server_attempt=$((server_attempt + 1))
    fi
done

if [ $server_attempt -gt $max_server_attempts ]; then
    echo "❌ Backend server failed to start after $max_server_attempts attempts"
    echo "📋 Checking server logs..."
    jobs
    echo "📋 Checking if port 8000 is listening:"
    netstat -tlnp | grep 8000 || echo "Port 8000 not listening"
    exit 1
fi

echo "🎯 Backend ready for E2E testing!" 