#!/bin/bash

# Synthos Startup Script
# This script starts both frontend and backend with proper error handling

set -e

echo "🚀 Starting Synthos Development Environment..."
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm"
        exit 1
    fi
    
    if ! command -v python &> /dev/null; then
        print_error "Python is not installed. Please install Python 3.8+"
        exit 1
    fi
    
    print_success "All dependencies are installed"
}

# Test backend startup
test_backend() {
    print_status "Testing backend startup..."
    
    cd backend
    
    # Test imports
    if python test_startup.py; then
        print_success "Backend imports and app creation successful"
    else
        print_error "Backend startup failed"
        exit 1
    fi
    
    cd ..
}

# Install frontend dependencies
install_frontend() {
    print_status "Installing frontend dependencies..."
    
    cd frontend
    
    if npm install; then
        print_success "Frontend dependencies installed"
    else
        print_error "Frontend dependency installation failed"
        exit 1
    fi
    
    cd ..
}

# Start backend in background
start_backend() {
    print_status "Starting backend server..."
    
    cd backend
    
    # Start backend in background
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
    BACKEND_PID=$!
    
    # Wait a moment for backend to start
    sleep 3
    
    # Test if backend is responding
    if curl -s http://localhost:8000/health > /dev/null; then
        print_success "Backend is running on http://localhost:8000"
    else
        print_warning "Backend may not be fully started yet"
    fi
    
    cd ..
}

# Start frontend
start_frontend() {
    print_status "Starting frontend development server..."
    
    cd frontend
    
    # Start frontend
    npm run dev &
    FRONTEND_PID=$!
    
    cd ..
}

# Cleanup function
cleanup() {
    print_status "Shutting down servers..."
    
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    print_success "Servers stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Main execution
main() {
    echo "=============================================="
    print_status "Initializing Synthos development environment..."
    
    # Check dependencies
    check_dependencies
    
    # Test backend
    test_backend
    
    # Install frontend dependencies
    install_frontend
    
    # Start backend
    start_backend
    
    # Start frontend
    start_frontend
    
    echo "=============================================="
    print_success "Synthos is starting up!"
    print_status "Backend: http://localhost:8000"
    print_status "Frontend: http://localhost:3000"
    print_status "Health Check: http://localhost:8000/health"
    echo "=============================================="
    print_status "Press Ctrl+C to stop all servers"
    echo ""
    
    # Wait for user to stop
    wait
}

# Run main function
main "$@" 