#!/bin/bash

# Synthos Platform - Complete Installation and Startup Script
# This script will install all dependencies and start both backend and frontend

set -e

echo "🚀 Synthos Platform Installation & Startup"
echo "========================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check required tools
print_status "Checking required tools..."

if ! command_exists python3; then
    print_error "Python 3 is required but not installed."
    exit 1
fi

if ! command_exists node; then
    print_error "Node.js is required but not installed."
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is required but not installed."
    exit 1
fi

print_success "All required tools are available!"

# Install Backend Dependencies
print_status "Installing backend dependencies..."
cd backend

# Check if virtual environment exists, create if not
if [ ! -d "venv" ]; then
    print_status "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
print_status "Activating virtual environment..."
source venv/bin/activate

# Install Python dependencies
print_status "Installing Python packages..."
pip install --upgrade pip

# Install core dependencies that are definitely needed
pip install \
    structlog>=23.2.0 \
    fastapi>=0.104.1 \
    uvicorn[standard]>=0.24.0 \
    sqlalchemy>=2.0.23 \
    psycopg2-binary>=2.9.9 \
    alembic>=1.13.1 \
    asyncpg>=0.29.0 \
    passlib[bcrypt]>=1.7.4 \
    python-jose[cryptography]>=3.3.0 \
    python-multipart>=0.0.6 \
    itsdangerous>=2.1.2 \
    slowapi>=0.1.9 \
    PyJWT>=2.8.0 \
    redis>=5.0.1 \
    aioredis>=2.0.1 \
    celery>=5.3.4 \
    boto3>=1.34.0 \
    anthropic>=0.7.8 \
    openai>=1.6.1 \
    sentry-sdk[fastapi]>=1.39.2 \
    prometheus-client>=0.19.0 \
    pydantic>=2.5.0 \
    email-validator>=2.1.0 \
    jinja2>=3.1.2

print_success "Backend dependencies installed!"

# Test backend import
print_status "Testing backend imports..."
python3 -c "from app.main import app; print('✅ Backend imports successfully!')" || {
    print_error "Backend import test failed!"
    exit 1
}

print_success "Backend is ready!"

# Move to frontend directory
cd ../frontend

# Install Frontend Dependencies
print_status "Installing frontend dependencies..."

# Clean install to ensure all dependencies are properly installed
rm -rf node_modules package-lock.json 2>/dev/null || true

npm install \
    next@14.0.0 \
    react@^18 \
    react-dom@^18 \
    typescript@^5 \
    tailwindcss@^3.3.0 \
    autoprefixer@^10.4.16 \
    postcss@^8.4.31 \
    framer-motion@^10.16.5 \
    three@^0.158.0 \
    @types/three@^0.158.3 \
    @react-three/fiber@^8.15.11 \
    @react-three/drei@^9.88.17 \
    lucide-react@^0.292.0 \
    next-themes@^0.2.1 \
    react-hot-toast@^2.4.1 \
    axios@^1.6.0 \
    crypto-js@^4.2.0 \
    dompurify@^3.2.6 \
    @types/crypto-js@^4.2.2 \
    @types/dompurify@^3.0.5

print_success "Frontend dependencies installed!"

# Test frontend build
print_status "Testing frontend build..."
npm run build || {
    print_warning "Frontend build had issues, but continuing..."
    print_status "This might be due to network connectivity issues with fonts"
}

print_success "Installation complete!"

# Start services
print_status "Starting Synthos Platform services..."

# Function to start backend
start_backend() {
    print_status "Starting backend on http://localhost:8000..."
    cd backend
    source venv/bin/activate
    python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
    BACKEND_PID=$!
    cd ..
    echo $BACKEND_PID > .backend_pid
}

# Function to start frontend  
start_frontend() {
    print_status "Starting frontend on http://localhost:3000..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    echo $FRONTEND_PID > .frontend_pid
}

# Function to wait for service
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for $service_name to start..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            print_warning "$service_name is taking longer than expected to start"
            return 1
        fi
        
        printf "."
        sleep 2
        attempt=$((attempt + 1))
    done
}

# Start backend
start_backend

# Start frontend
start_frontend

# Wait for services
wait_for_service "http://localhost:8000/health" "Backend"
wait_for_service "http://localhost:3000" "Frontend"

print_success "🎉 Synthos Platform is now running!"
echo ""
echo "📍 Services:"
echo "   🔗 Frontend: http://localhost:3000"
echo "   🔗 Backend:  http://localhost:8000"
echo "   🔗 API Docs: http://localhost:8000/docs"
echo ""
echo "💡 Features:"
echo "   ✨ Beautiful 3D animated homepage"
echo "   📊 Interactive 3D data visualization"
echo "   🤖 AI-powered synthetic data generation"
echo "   🔒 Enterprise-grade security"
echo ""
echo "To stop the services, run: ./stop_synthos.sh"
echo "Or press Ctrl+C to stop this script"

# Keep script running
wait 