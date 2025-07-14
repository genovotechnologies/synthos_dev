#!/bin/bash

# =============================================================================
# Synthos Platform - Enterprise Startup Script
# =============================================================================
# 
# This script provides multiple ways to run the Synthos platform:
# - Development mode: Local development with hot reload
# - Docker mode: Full containerized environment
# - Production mode: Optimized production deployment
#
# Usage:
#   ./start.sh dev              # Development mode
#   ./start.sh docker           # Docker mode
#   ./start.sh prod             # Production mode
#   ./start.sh stop             # Stop all services
#   ./start.sh health           # Health check
#   ./start.sh logs             # Show logs
#
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="Synthos"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
LOGS_DIR="$PROJECT_ROOT/logs"
PIDS_FILE="$PROJECT_ROOT/.pids"

# Default ports
BACKEND_PORT=${BACKEND_PORT:-8000}
FRONTEND_PORT=${FRONTEND_PORT:-3000}
REDIS_PORT=${REDIS_PORT:-6379}
POSTGRES_PORT=${POSTGRES_PORT:-5432}

# =============================================================================
# Utility Functions
# =============================================================================

log() {
    echo -e "${WHITE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_section() {
    echo -e "\n${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${PURPLE}  $1${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

show_banner() {
    echo -e "${CYAN}"
    cat << "EOF"
   ██████╗██╗   ██╗███╗   ██╗████████╗██╗  ██╗ ██████╗ ███████╗
  ██╔════╝╚██╗ ██╔╝████╗  ██║╚══██╔══╝██║  ██║██╔═══██╗██╔════╝
  ╚█████╗  ╚████╔╝ ██╔██╗ ██║   ██║   ███████║██║   ██║███████╗
   ╚═══██╗  ╚██╔╝  ██║╚██╗██║   ██║   ██╔══██║██║   ██║╚════██║
  ██████╔╝   ██║   ██║ ╚████║   ██║   ██║  ██║╚██████╔╝███████║
  ╚═════╝    ╚═╝   ╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
  
        Enterprise Synthetic Data Platform
EOF
    echo -e "${NC}\n"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if port is available
port_available() {
    ! lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1
}

# Wait for service to be ready
wait_for_service() {
    local host=$1
    local port=$2
    local service_name=$3
    local max_attempts=30
    local attempt=1

    log_info "Waiting for $service_name to be ready on $host:$port..."
    
    while [ $attempt -le $max_attempts ]; do
        if nc -z "$host" "$port" 2>/dev/null; then
            log_success "$service_name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    log_error "$service_name failed to start after $((max_attempts * 2)) seconds"
    return 1
}

# Health check function
health_check() {
    local service=$1
    local url=$2
    
    if command_exists curl; then
        if curl -sf "$url" >/dev/null 2>&1; then
            log_success "$service is healthy"
            return 0
        else
            log_error "$service health check failed"
            return 1
        fi
    else
        log_warning "curl not available, skipping health check for $service"
        return 0
    fi
}

# =============================================================================
# Dependency Checks
# =============================================================================

check_dependencies() {
    log_section "Checking Dependencies"
    
    local missing_deps=()
    
    # Required for all modes
    if ! command_exists git; then
        missing_deps+=("git")
    fi
    
    # Development mode dependencies
    if [ "${1:-dev}" == "dev" ]; then
        if ! command_exists python3; then
            missing_deps+=("python3")
        fi
        
        if ! command_exists node; then
            missing_deps+=("node")
        fi
        
        if ! command_exists npm; then
            missing_deps+=("npm")
        fi
        
        if ! command_exists redis-server; then
            log_warning "redis-server not found. Using Docker for Redis."
        fi
        
        if ! command_exists psql; then
            log_warning "PostgreSQL not found. Using Docker for database."
        fi
    fi
    
    # Docker mode dependencies
    if [ "${1:-dev}" == "docker" ]; then
        if ! command_exists docker; then
            missing_deps+=("docker")
        fi
        
        if ! command_exists docker-compose; then
            missing_deps+=("docker-compose")
        fi
    fi
    
    # Check for optional dependencies
    if ! command_exists nc; then
        log_warning "netcat (nc) not found. Health checks may not work properly."
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_info "Please install the missing dependencies and try again."
        exit 1
    fi
    
    log_success "All required dependencies are available"
}

# =============================================================================
# Environment Setup
# =============================================================================

setup_environment() {
    log_section "Setting Up Environment"
    
    # Create necessary directories
    mkdir -p "$LOGS_DIR"
    mkdir -p "$PROJECT_ROOT/uploads"
    mkdir -p "$PROJECT_ROOT/exports"
    
    # Create .env files if they don't exist
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        log_info "Creating backend .env file..."
        cat > "$BACKEND_DIR/.env" << 'EOL'
# Development Environment Configuration
ENVIRONMENT=development
DEBUG=true

# Database
DATABASE_URL=postgresql://synthos:securepassword123@localhost:5432/synthos_db

# Redis
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=dev-secret-key-change-in-production
JWT_SECRET_KEY=dev-jwt-secret-change-in-production

# API Keys (add your own)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here

# AWS (for file storage)
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_S3_BUCKET=synthos-dev

# CORS
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
ALLOWED_HOSTS=localhost,127.0.0.1

# Limits
FREE_TIER_MONTHLY_LIMIT=10000
MAX_SYNTHETIC_ROWS=100000
EOL
        log_warning "Please update the API keys in $BACKEND_DIR/.env"
    fi
    
    if [ ! -f "$FRONTEND_DIR/.env.local" ]; then
        log_info "Creating frontend .env.local file..."
        cat > "$FRONTEND_DIR/.env.local" << 'EOL'
# Frontend Environment Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=your_stripe_public_key_here
EOL
    fi
    
    log_success "Environment setup complete"
}

# =============================================================================
# Development Mode
# =============================================================================

start_dev() {
    log_section "Starting Development Mode"
    
    # Clear any existing PIDs
    rm -f "$PIDS_FILE"
    
    # Start infrastructure services with Docker
    log_info "Starting infrastructure services..."
    
    # Start PostgreSQL
    if port_available $POSTGRES_PORT; then
        log_info "Starting PostgreSQL..."
        docker run -d \
            --name synthos-postgres-dev \
            -e POSTGRES_DB=synthos_db \
            -e POSTGRES_USER=synthos \
            -e POSTGRES_PASSWORD=securepassword123 \
            -p $POSTGRES_PORT:5432 \
            --restart unless-stopped \
            postgres:15-alpine
        
        wait_for_service localhost $POSTGRES_PORT "PostgreSQL"
    else
        log_info "PostgreSQL already running on port $POSTGRES_PORT"
    fi
    
    # Start Redis
    if port_available $REDIS_PORT; then
        log_info "Starting Redis..."
        docker run -d \
            --name synthos-redis-dev \
            -p $REDIS_PORT:6379 \
            --restart unless-stopped \
            redis:7-alpine
        
        wait_for_service localhost $REDIS_PORT "Redis"
    else
        log_info "Redis already running on port $REDIS_PORT"
    fi
    
    # Setup Python virtual environment
    cd "$BACKEND_DIR"
    if [ ! -d "venv" ]; then
        log_info "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    source venv/bin/activate
    
    # Install Python dependencies
    log_info "Installing Python dependencies..."
    pip install -q --upgrade pip
    pip install -q -r requirements.txt
    
    # Run database migrations
    log_info "Running database migrations..."
    if [ -f "alembic.ini" ]; then
        alembic upgrade head
    fi
    
    # Start backend
    log_info "Starting FastAPI backend on port $BACKEND_PORT..."
    if port_available $BACKEND_PORT; then
        uvicorn app.main:app \
            --host 0.0.0.0 \
            --port $BACKEND_PORT \
            --reload \
            --reload-dir app \
            --log-level info \
            > "$LOGS_DIR/backend.log" 2>&1 &
        
        echo $! >> "$PIDS_FILE"
        wait_for_service localhost $BACKEND_PORT "Backend API"
        health_check "Backend" "http://localhost:$BACKEND_PORT/health"
    else
        log_warning "Backend port $BACKEND_PORT is already in use"
    fi
    
    # Setup and start frontend
    cd "$FRONTEND_DIR"
    
    # Install Node dependencies
    if [ ! -d "node_modules" ] || [ ! -f "package-lock.json" ]; then
        log_info "Installing Node.js dependencies..."
        npm install
    fi
    
    # Start frontend
    log_info "Starting Next.js frontend on port $FRONTEND_PORT..."
    if port_available $FRONTEND_PORT; then
        npm run dev > "$LOGS_DIR/frontend.log" 2>&1 &
        echo $! >> "$PIDS_FILE"
        
        wait_for_service localhost $FRONTEND_PORT "Frontend"
        health_check "Frontend" "http://localhost:$FRONTEND_PORT/"
    else
        log_warning "Frontend port $FRONTEND_PORT is already in use"
    fi
    
    cd "$PROJECT_ROOT"
    
    log_success "Development environment started successfully!"
    log_info "Backend API: http://localhost:$BACKEND_PORT"
    log_info "API Documentation: http://localhost:$BACKEND_PORT/api/docs"
    log_info "Frontend: http://localhost:$FRONTEND_PORT"
    log_info ""
    log_info "Logs are available in: $LOGS_DIR"
    log_info "Use './start.sh stop' to stop all services"
    log_info "Use './start.sh logs' to view logs"
}

# =============================================================================
# Docker Mode
# =============================================================================

start_docker() {
    log_section "Starting Docker Mode"
    
    # Build and start all services
    log_info "Building and starting all services with Docker Compose..."
    
    # Create .env file for docker-compose
    cat > .env << EOL
ENVIRONMENT=development
POSTGRES_PASSWORD=securepassword123
SECRET_KEY=dev-secret-key-change-in-production
JWT_SECRET_KEY=dev-jwt-secret-change-in-production
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:-}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-}
AWS_S3_BUCKET=${AWS_S3_BUCKET:-synthos-dev}
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=${NEXT_PUBLIC_STRIPE_PUBLIC_KEY:-}
GRAFANA_PASSWORD=admin123
EOL
    
    # Start services
    docker-compose up -d --build
    
    # Wait for services to be ready
    wait_for_service localhost 5432 "PostgreSQL"
    wait_for_service localhost 6379 "Redis"
    wait_for_service localhost 8000 "Backend API"
    wait_for_service localhost 3000 "Frontend"
    
    # Health checks
    sleep 5
    health_check "Backend" "http://localhost:8000/health"
    health_check "Frontend" "http://localhost:3000/"
    
    log_success "Docker environment started successfully!"
    log_info "Backend API: http://localhost:8000"
    log_info "API Documentation: http://localhost:8000/api/docs"
    log_info "Frontend: http://localhost:3000"
    log_info "Flower (Celery Monitor): http://localhost:5555"
    log_info "Prometheus: http://localhost:9090"
    log_info "Grafana: http://localhost:3001"
    log_info ""
    log_info "Use 'docker-compose logs -f' to view logs"
    log_info "Use './start.sh stop' to stop all services"
}

# =============================================================================
# Production Mode
# =============================================================================

start_production() {
    log_section "Starting Production Mode"
    
    log_warning "Production mode requires additional configuration!"
    log_info "Please ensure you have:"
    log_info "1. Configured all environment variables"
    log_info "2. Set up SSL certificates"
    log_info "3. Configured reverse proxy (nginx)"
    log_info "4. Set up monitoring and logging"
    
    read -p "Continue with production startup? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Production startup cancelled"
        exit 0
    fi
    
    # Use production docker-compose
    export ENVIRONMENT=production
    export BUILD_TARGET=production
    export FRONTEND_BUILD_TARGET=production
    
    docker-compose -f docker-compose.prod.yml up -d --build
    
    log_success "Production environment started!"
    log_warning "Remember to configure your reverse proxy and SSL"
}

# =============================================================================
# Stop Services
# =============================================================================

stop_services() {
    log_section "Stopping All Services"
    
    # Stop Docker containers
    log_info "Stopping Docker containers..."
    docker-compose down 2>/dev/null || true
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    
    # Stop development containers
    docker stop synthos-postgres-dev 2>/dev/null || true
    docker stop synthos-redis-dev 2>/dev/null || true
    docker rm synthos-postgres-dev 2>/dev/null || true
    docker rm synthos-redis-dev 2>/dev/null || true
    
    # Stop development processes
    if [ -f "$PIDS_FILE" ]; then
        log_info "Stopping development processes..."
        while read -r pid; do
            if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
                kill "$pid" 2>/dev/null || true
            fi
        done < "$PIDS_FILE"
        rm -f "$PIDS_FILE"
    fi
    
    # Kill any remaining processes
    pkill -f "uvicorn app.main:app" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true
    
    log_success "All services stopped"
}

# =============================================================================
# Show Logs
# =============================================================================

show_logs() {
    log_section "Service Logs"
    
    if [ -f "$LOGS_DIR/backend.log" ] || [ -f "$LOGS_DIR/frontend.log" ]; then
        log_info "Development logs:"
        if [ -f "$LOGS_DIR/backend.log" ]; then
            echo -e "\n${YELLOW}Backend logs:${NC}"
            tail -20 "$LOGS_DIR/backend.log"
        fi
        if [ -f "$LOGS_DIR/frontend.log" ]; then
            echo -e "\n${YELLOW}Frontend logs:${NC}"
            tail -20 "$LOGS_DIR/frontend.log"
        fi
    fi
    
    if docker-compose ps >/dev/null 2>&1; then
        log_info "Docker logs:"
        docker-compose logs --tail=20
    fi
}

# =============================================================================
# Health Check
# =============================================================================

check_health() {
    log_section "Health Check"
    
    local services=()
    
    # Check if development services are running
    if nc -z localhost $BACKEND_PORT 2>/dev/null; then
        services+=("Backend:http://localhost:$BACKEND_PORT")
    fi
    
    if nc -z localhost $FRONTEND_PORT 2>/dev/null; then
        services+=("Frontend:http://localhost:$FRONTEND_PORT")
    fi
    
    if nc -z localhost $POSTGRES_PORT 2>/dev/null; then
        services+=("PostgreSQL:localhost:$POSTGRES_PORT")
    fi
    
    if nc -z localhost $REDIS_PORT 2>/dev/null; then
        services+=("Redis:localhost:$REDIS_PORT")
    fi
    
    if [ ${#services[@]} -eq 0 ]; then
        log_warning "No services detected running locally"
        
        # Check Docker services
        if docker-compose ps >/dev/null 2>&1; then
            log_info "Docker services:"
            docker-compose ps
        fi
    else
        log_success "Found ${#services[@]} running services:"
        for service in "${services[@]}"; do
            echo -e "  ${GREEN}✓${NC} $service"
        done
        
        # Perform health checks
        if nc -z localhost $BACKEND_PORT 2>/dev/null; then
            health_check "Backend API" "http://localhost:$BACKEND_PORT/health"
        fi
        
        if nc -z localhost $FRONTEND_PORT 2>/dev/null; then
            health_check "Frontend" "http://localhost:$FRONTEND_PORT/"
        fi
    fi
}

# =============================================================================
# Main Script Logic
# =============================================================================

main() {
    show_banner
    
    local command=${1:-help}
    
    case $command in
        "dev"|"development")
            check_dependencies "dev"
            setup_environment
            start_dev
            ;;
        "docker")
            check_dependencies "docker"
            setup_environment
            start_docker
            ;;
        "prod"|"production")
            check_dependencies "docker"
            start_production
            ;;
        "stop")
            stop_services
            ;;
        "logs")
            show_logs
            ;;
        "health")
            check_health
            ;;
        "restart")
            stop_services
            sleep 2
            if [ "${2:-dev}" == "docker" ]; then
                start_docker
            else
                start_dev
            fi
            ;;
        "help"|*)
            echo -e "${WHITE}Synthos Platform Startup Script${NC}"
            echo ""
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  dev, development    Start in development mode (default)"
            echo "  docker             Start with Docker Compose"
            echo "  prod, production   Start in production mode"
            echo "  stop               Stop all services"
            echo "  restart [mode]     Restart services (dev or docker)"
            echo "  logs               Show service logs"
            echo "  health             Check service health"
            echo "  help               Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 dev             # Start development environment"
            echo "  $0 docker          # Start with Docker"
            echo "  $0 restart docker  # Restart in Docker mode"
            echo ""
            exit 0
            ;;
    esac
}

# Trap to handle script interruption
trap 'log_warning "Script interrupted. Run \"./start.sh stop\" to clean up."; exit 1' INT TERM

# Run main function with all arguments
main "$@" 