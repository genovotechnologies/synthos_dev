#!/bin/bash

# =============================================================================
# SYNTHOS BACKEND DEPENDENCY INSTALLATION SCRIPT
# Handles installation with proper flags to avoid build issues
# =============================================================================

set -e

echo "🚀 Installing Synthos Backend Dependencies..."

# Upgrade pip first
echo "📦 Upgrading pip..."
pip install --upgrade pip

# Install numpy first with specific flags
echo "🔢 Installing numpy with build flags..."
pip install numpy==1.24.3 --no-build-isolation --no-cache-dir

# Install pandas with compatible numpy
echo "📊 Installing pandas..."
pip install pandas==2.1.4 --no-cache-dir

# Install core dependencies
echo "🔧 Installing core dependencies..."
pip install fastapi==0.104.1 uvicorn[standard]==0.24.0 pydantic==2.5.2 --no-cache-dir

# Install database dependencies
echo "🗄️ Installing database dependencies..."
pip install sqlalchemy==2.0.25 psycopg2-binary==2.9.9 alembic==1.13.1 asyncpg==0.29.0 --no-cache-dir

# Install authentication dependencies
echo "🔐 Installing authentication dependencies..."
pip install passlib[bcrypt]==1.7.4 PyJWT==2.8.0 python-jose[cryptography]==3.3.0 --no-cache-dir

# Install other essential dependencies
echo "📋 Installing other essential dependencies..."
pip install python-multipart==0.0.6 itsdangerous==2.1.2 slowapi==0.1.9 --no-cache-dir
pip install email-validator==2.1.0.post1 jinja2==3.1.3 --no-cache-dir
pip install redis==5.0.1 aioredis==2.0.1 --no-cache-dir
pip install celery==5.3.4 --no-cache-dir
pip install boto3==1.34.34 botocore==1.34.34 --no-cache-dir
pip install anthropic==0.8.1 openai==1.12.0 --no-cache-dir
pip install sentry-sdk[fastapi]==1.40.6 structlog==23.2.0 python-json-logger==3.1.0 --no-cache-dir
pip install stripe==7.12.0 --no-cache-dir
pip install aiofiles==24.1.0 openpyxl==3.1.2 --no-cache-dir
pip install httpx==0.26.0 requests==2.31.0 --no-cache-dir
pip install python-decouple==3.8 python-dotenv==1.0.1 --no-cache-dir
pip install pytz==2024.1 psutil==5.9.8 --no-cache-dir
pip install marshmallow==3.20.2 --no-cache-dir

# Install testing dependencies
echo "🧪 Installing testing dependencies..."
pip install pytest==7.4.3 pytest-cov==4.1.0 pytest-asyncio==0.21.1 --no-cache-dir

echo "✅ All dependencies installed successfully!"
echo "📋 Installed packages:"
pip list 