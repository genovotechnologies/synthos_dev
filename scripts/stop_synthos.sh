#!/bin/bash

# Synthos Platform - Stop Services Script

echo "🛑 Stopping Synthos Platform services..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "[INFO] $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to kill process by PID file
kill_by_pidfile() {
    local pidfile=$1
    local service_name=$2
    
    if [ -f "$pidfile" ]; then
        local pid=$(cat "$pidfile")
        if kill -0 "$pid" 2>/dev/null; then
            print_status "Stopping $service_name (PID: $pid)..."
            kill "$pid" 2>/dev/null
            sleep 2
            
            # Force kill if still running
            if kill -0 "$pid" 2>/dev/null; then
                print_warning "Force stopping $service_name..."
                kill -9 "$pid" 2>/dev/null
            fi
            
            print_success "$service_name stopped"
        else
            print_warning "$service_name was not running"
        fi
        rm -f "$pidfile"
    else
        print_warning "No PID file found for $service_name"
    fi
}

# Stop services by PID files
kill_by_pidfile ".backend_pid" "Backend"
kill_by_pidfile ".frontend_pid" "Frontend"

# Also kill any remaining processes on the ports
print_status "Cleaning up remaining processes..."

# Kill processes on port 8000 (backend)
if lsof -ti:8000 >/dev/null 2>&1; then
    print_status "Stopping processes on port 8000..."
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
fi

# Kill processes on port 3000 (frontend)
if lsof -ti:3000 >/dev/null 2>&1; then
    print_status "Stopping processes on port 3000..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
fi

# Kill any uvicorn processes
pkill -f uvicorn 2>/dev/null || true

# Kill any npm/node processes related to Next.js
pkill -f "next-server" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true

print_success "🎉 All Synthos Platform services stopped!"
echo ""
echo "To restart the platform, run: ./install_and_run.sh" 