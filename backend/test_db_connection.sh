#!/bin/bash

# =============================================================================
# DATABASE CONNECTION TEST SCRIPT
# Tests database connectivity for debugging
# =============================================================================

echo "🔍 Testing database connectivity..."

# Check if PostgreSQL is running
echo "📋 Checking if PostgreSQL is running..."
if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "✅ PostgreSQL is running"
else
    echo "❌ PostgreSQL is not running"
    echo "💡 Start with: docker-compose up -d postgres redis"
    exit 1
fi

# Check if we can connect as postgres user
echo "📋 Testing postgres user connection..."
if psql -h localhost -U postgres -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Can connect as postgres user"
else
    echo "❌ Cannot connect as postgres user"
    exit 1
fi

# Check if synthos user exists
echo "📋 Checking if synthos user exists..."
if psql -h localhost -U postgres -c "SELECT 1 FROM pg_user WHERE usename='synthos';" | grep -q 1; then
    echo "✅ synthos user exists"
else
    echo "⚠️ synthos user does not exist"
fi

# Check if synthos_db database exists
echo "📋 Checking if synthos_db database exists..."
if psql -h localhost -U postgres -c "SELECT 1 FROM pg_database WHERE datname='synthos_db';" | grep -q 1; then
    echo "✅ synthos_db database exists"
else
    echo "⚠️ synthos_db database does not exist"
fi

# Test connection with synthos user
echo "📋 Testing synthos user connection..."
if pg_isready -h localhost -p 5432 -U synthos -d synthos_db > /dev/null 2>&1; then
    echo "✅ Can connect as synthos user to synthos_db"
else
    echo "❌ Cannot connect as synthos user to synthos_db"
fi

echo "🎯 Database connectivity test completed!" 