#!/bin/bash

# Railway Startup Script for Synthos Backend
# This script handles database migrations and starts the FastAPI server

set -e

echo "🚀 Starting Synthos Backend on Railway..."

# Set default values for Railway environment
export ENVIRONMENT=${ENVIRONMENT:-production}
export DEBUG=${DEBUG:-false}

# Railway automatically provides DATABASE_URL and REDIS_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set. Make sure PostgreSQL service is added to Railway."
    exit 1
fi

if [ -z "$REDIS_URL" ]; then
    echo "❌ REDIS_URL not set. Make sure Redis service is added to Railway."
    exit 1
fi

# Set Celery URLs if not explicitly provided
export CELERY_BROKER_URL=${CELERY_BROKER_URL:-$REDIS_URL}
export CELERY_RESULT_BACKEND=${CELERY_RESULT_BACKEND:-$REDIS_URL}

echo "✅ Environment variables configured"

# Run database migrations
echo "🔄 Running database migrations..."
python -m alembic upgrade head

# Create upload directories
mkdir -p /app/uploads /app/exports
echo "✅ Upload directories created"

# Start the FastAPI server
echo "🌟 Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2 