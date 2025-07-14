#!/bin/bash

# Railway Celery Worker Startup Script
# This script starts the Celery worker for background tasks

set -e

echo "🚀 Starting Synthos Celery Worker on Railway..."

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

# Start the Celery worker
echo "🔄 Starting Celery worker..."
exec celery -A app.core.celery worker --loglevel=info --concurrency=2 