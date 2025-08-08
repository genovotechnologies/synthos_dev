#!/bin/bash

# =============================================================================
# CI ENVIRONMENT DEBUG SCRIPT
# Debugs the CI environment and database connectivity
# =============================================================================

echo "🔍 Debugging CI Environment..."

echo "📋 System Information:"
echo "OS: $(uname -a)"
echo "Docker version: $(docker --version 2>/dev/null || echo 'Docker not available')"
echo "Docker Compose version: $(docker-compose --version 2>/dev/null || docker compose version 2>/dev/null || echo 'Docker Compose not available')"

echo ""
echo "📋 Current Directory:"
pwd
ls -la

echo ""
echo "📋 Docker Compose File:"
if [ -f "../docker-compose.yml" ]; then
    echo "Found docker-compose.yml in parent directory"
    cat ../docker-compose.yml | head -50
else
    echo "docker-compose.yml not found in parent directory"
fi

echo ""
echo "📋 Docker Services:"
echo "Running containers:"
docker ps 2>/dev/null || echo "Docker not available or no containers running"

echo ""
echo "📋 Network Ports:"
echo "Port 5432 (PostgreSQL):"
netstat -tlnp | grep 5432 2>/dev/null || echo "Port 5432 not listening"
echo "Port 6379 (Redis):"
netstat -tlnp | grep 6379 2>/dev/null || echo "Port 6379 not listening"

echo ""
echo "📋 PostgreSQL Connection Test:"
if command -v pg_isready >/dev/null 2>&1; then
    echo "pg_isready available"
    pg_isready -h localhost -p 5432 2>/dev/null && echo "✅ PostgreSQL is ready" || echo "❌ PostgreSQL is not ready"
else
    echo "pg_isready not available"
fi

echo ""
echo "📋 Environment Variables:"
echo "DATABASE_URL: ${DATABASE_URL:-'not set'}"
echo "REDIS_URL: ${REDIS_URL:-'not set'}"

echo ""
echo "🎯 CI Environment Debug Complete!" 