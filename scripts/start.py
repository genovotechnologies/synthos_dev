#!/usr/bin/env python3
"""
Synthos Platform - Cross-Platform Python Startup Script
=======================================================

This script provides a cross-platform way to start the Synthos platform
with the same functionality as the shell scripts but using Python.

Usage:
    python start.py dev              # Development mode
    python start.py docker           # Docker mode
    python start.py prod             # Production mode
    python start.py stop             # Stop all services
    python start.py health           # Health check
    python start.py logs             # Show logs
"""

import os
import sys
import subprocess
import time
import json
import signal
import platform
import shutil
from pathlib import Path
from typing import List, Optional, Dict
import argparse

# Configuration
PROJECT_NAME = "Synthos"
PROJECT_ROOT = Path(__file__).parent.absolute()
BACKEND_DIR = PROJECT_ROOT / "backend"
FRONTEND_DIR = PROJECT_ROOT / "frontend"
LOGS_DIR = PROJECT_ROOT / "logs"
PIDS_FILE = PROJECT_ROOT / ".pids"

# Default ports
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8000"))
FRONTEND_PORT = int(os.getenv("FRONTEND_PORT", "3000"))
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", "5432"))

# Colors for terminal output
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    PURPLE = '\033[0;35m'
    CYAN = '\033[0;36m'
    WHITE = '\033[1;37m'
    NC = '\033[0m'  # No Color

class Logger:
    """Simple logger with colored output"""
    
    @staticmethod
    def info(message: str):
        print(f"{Colors.BLUE}[INFO]{Colors.NC} {message}")
    
    @staticmethod
    def success(message: str):
        print(f"{Colors.GREEN}[SUCCESS]{Colors.NC} {message}")
    
    @staticmethod
    def warning(message: str):
        print(f"{Colors.YELLOW}[WARNING]{Colors.NC} {message}")
    
    @staticmethod
    def error(message: str):
        print(f"{Colors.RED}[ERROR]{Colors.NC} {message}")
    
    @staticmethod
    def section(message: str):
        print(f"\n{Colors.PURPLE}{'='*80}")
        print(f"  {message}")
        print(f"{'='*80}{Colors.NC}\n")

def show_banner():
    """Display the Synthos banner"""
    banner = f"""{Colors.CYAN}
   ██████╗██╗   ██╗███╗   ██╗████████╗██╗  ██╗ ██████╗ ███████╗
  ██╔════╝╚██╗ ██╔╝████╗  ██║╚══██╔══╝██║  ██║██╔═══██╗██╔════╝
  ╚█████╗  ╚████╔╝ ██╔██╗ ██║   ██║   ███████║██║   ██║███████╗
   ╚═══██╗  ╚██╔╝  ██║╚██╗██║   ██║   ██╔══██║██║   ██║╚════██║
  ██████╔╝   ██║   ██║ ╚████║   ██║   ██║  ██║╚██████╔╝███████║
  ╚═════╝    ╚═╝   ╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
  
        Enterprise Synthetic Data Platform
{Colors.NC}"""
    print(banner)

def command_exists(command: str) -> bool:
    """Check if a command exists in PATH"""
    return shutil.which(command) is not None

def port_available(port: int) -> bool:
    """Check if a port is available"""
    import socket
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1)
            result = s.connect_ex(('localhost', port))
            return result != 0
    except Exception:
        return True

def wait_for_service(host: str, port: int, service_name: str, max_attempts: int = 30) -> bool:
    """Wait for a service to be ready"""
    import socket
    
    Logger.info(f"Waiting for {service_name} to be ready on {host}:{port}...")
    
    for attempt in range(max_attempts):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(2)
                if s.connect_ex((host, port)) == 0:
                    Logger.success(f"{service_name} is ready!")
                    return True
        except Exception:
            pass
        
        print(".", end="", flush=True)
        time.sleep(2)
    
    print()  # New line after dots
    Logger.error(f"{service_name} failed to start after {max_attempts * 2} seconds")
    return False

def health_check(service: str, url: str) -> bool:
    """Perform health check on a service"""
    try:
        import urllib.request
        response = urllib.request.urlopen(url, timeout=5)
        if response.status == 200:
            Logger.success(f"{service} is healthy")
            return True
        else:
            Logger.error(f"{service} health check failed with status {response.status}")
            return False
    except Exception as e:
        Logger.error(f"{service} health check failed: {str(e)}")
        return False

def run_command(command: List[str], cwd: Optional[Path] = None, 
                capture_output: bool = False, check: bool = True) -> subprocess.CompletedProcess:
    """Run a command with proper error handling"""
    try:
        return subprocess.run(
            command,
            cwd=cwd,
            capture_output=capture_output,
            text=True,
            check=check
        )
    except subprocess.CalledProcessError as e:
        Logger.error(f"Command failed: {' '.join(command)}")
        if e.stdout:
            print(f"STDOUT: {e.stdout}")
        if e.stderr:
            print(f"STDERR: {e.stderr}")
        raise

def setup_environment():
    """Set up the development environment"""
    Logger.section("Setting Up Environment")
    
    # Create necessary directories
    LOGS_DIR.mkdir(exist_ok=True)
    (PROJECT_ROOT / "uploads").mkdir(exist_ok=True)
    (PROJECT_ROOT / "exports").mkdir(exist_ok=True)
    
    # Create backend .env file
    backend_env = BACKEND_DIR / ".env"
    if not backend_env.exists():
        Logger.info("Creating backend .env file...")
        backend_env.write_text("""# Development Environment Configuration
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
""")
        Logger.warning(f"Please update the API keys in {backend_env}")
    
    # Create frontend .env.local file
    frontend_env = FRONTEND_DIR / ".env.local"
    if not frontend_env.exists():
        Logger.info("Creating frontend .env.local file...")
        frontend_env.write_text("""# Frontend Environment Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=your_stripe_public_key_here
""")
    
    Logger.success("Environment setup complete")

def check_dependencies(mode: str = "dev") -> bool:
    """Check if all required dependencies are available"""
    Logger.section("Checking Dependencies")
    
    missing_deps = []
    
    # Required for all modes
    if not command_exists("git"):
        missing_deps.append("git")
    
    # Development mode dependencies
    if mode == "dev":
        if not command_exists("python3") and not command_exists("python"):
            missing_deps.append("python3")
        
        if not command_exists("node"):
            missing_deps.append("node")
        
        if not command_exists("npm"):
            missing_deps.append("npm")
        
        if not command_exists("docker"):
            Logger.warning("Docker not found. Some infrastructure services may not be available.")
    
    # Docker mode dependencies
    if mode == "docker":
        if not command_exists("docker"):
            missing_deps.append("docker")
        
        if not command_exists("docker-compose"):
            missing_deps.append("docker-compose")
    
    if missing_deps:
        Logger.error(f"Missing required dependencies: {', '.join(missing_deps)}")
        Logger.info("Please install the missing dependencies and try again.")
        return False
    
    Logger.success("All required dependencies are available")
    return True

def start_infrastructure():
    """Start infrastructure services (PostgreSQL and Redis) with Docker"""
    Logger.info("Starting infrastructure services...")
    
    # Start PostgreSQL
    if port_available(POSTGRES_PORT):
        Logger.info("Starting PostgreSQL...")
        run_command([
            "docker", "run", "-d",
            "--name", "synthos-postgres-dev",
            "-e", "POSTGRES_DB=synthos_db",
            "-e", "POSTGRES_USER=synthos",
            "-e", "POSTGRES_PASSWORD=securepassword123",
            "-p", f"{POSTGRES_PORT}:5432",
            "--restart", "unless-stopped",
            "postgres:15-alpine"
        ], check=False)
        
        wait_for_service("localhost", POSTGRES_PORT, "PostgreSQL")
    else:
        Logger.info(f"PostgreSQL already running on port {POSTGRES_PORT}")
    
    # Start Redis
    if port_available(REDIS_PORT):
        Logger.info("Starting Redis...")
        run_command([
            "docker", "run", "-d",
            "--name", "synthos-redis-dev",
            "-p", f"{REDIS_PORT}:6379",
            "--restart", "unless-stopped",
            "redis:7-alpine"
        ], check=False)
        
        wait_for_service("localhost", REDIS_PORT, "Redis")
    else:
        Logger.info(f"Redis already running on port {REDIS_PORT}")

def start_dev():
    """Start the application in development mode"""
    Logger.section("Starting Development Mode")
    
    # Start infrastructure
    if command_exists("docker"):
        start_infrastructure()
    else:
        Logger.warning("Docker not available. Please ensure PostgreSQL and Redis are running manually.")
    
    # Setup Python backend
    Logger.info("Setting up Python backend...")
    
    venv_dir = BACKEND_DIR / "venv"
    if not venv_dir.exists():
        Logger.info("Creating Python virtual environment...")
        python_cmd = "python3" if command_exists("python3") else "python"
        run_command([python_cmd, "-m", "venv", "venv"], cwd=BACKEND_DIR)
    
    # Determine Python executable in venv
    if platform.system() == "Windows":
        python_venv = venv_dir / "Scripts" / "python.exe"
        pip_venv = venv_dir / "Scripts" / "pip.exe"
    else:
        python_venv = venv_dir / "bin" / "python"
        pip_venv = venv_dir / "bin" / "pip"
    
    # Install dependencies
    Logger.info("Installing Python dependencies...")
    run_command([str(pip_venv), "install", "--upgrade", "pip"], cwd=BACKEND_DIR)
    run_command([str(pip_venv), "install", "-r", "requirements.txt"], cwd=BACKEND_DIR)
    
    # Start backend
    Logger.info(f"Starting FastAPI backend on port {BACKEND_PORT}...")
    if port_available(BACKEND_PORT):
        backend_cmd = [
            str(python_venv), "-m", "uvicorn", "app.main:app",
            "--host", "0.0.0.0",
            "--port", str(BACKEND_PORT),
            "--reload",
            "--reload-dir", "app"
        ]
        
        # Start backend in background
        backend_process = subprocess.Popen(
            backend_cmd,
            cwd=BACKEND_DIR,
            stdout=open(LOGS_DIR / "backend.log", "w"),
            stderr=subprocess.STDOUT
        )
        
        # Save PID
        with open(PIDS_FILE, "a") as f:
            f.write(f"{backend_process.pid}\n")
        
        wait_for_service("localhost", BACKEND_PORT, "Backend API")
        health_check("Backend", f"http://localhost:{BACKEND_PORT}/health")
    else:
        Logger.warning(f"Backend port {BACKEND_PORT} is already in use")
    
    # Setup Node.js frontend
    Logger.info("Setting up Node.js frontend...")
    
    node_modules = FRONTEND_DIR / "node_modules"
    if not node_modules.exists():
        Logger.info("Installing Node.js dependencies...")
        run_command(["npm", "install"], cwd=FRONTEND_DIR)
    
    # Start frontend
    Logger.info(f"Starting Next.js frontend on port {FRONTEND_PORT}...")
    if port_available(FRONTEND_PORT):
        frontend_process = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=FRONTEND_DIR,
            stdout=open(LOGS_DIR / "frontend.log", "w"),
            stderr=subprocess.STDOUT
        )
        
        # Save PID
        with open(PIDS_FILE, "a") as f:
            f.write(f"{frontend_process.pid}\n")
        
        wait_for_service("localhost", FRONTEND_PORT, "Frontend")
    else:
        Logger.warning(f"Frontend port {FRONTEND_PORT} is already in use")
    
    Logger.success("Development environment started successfully!")
    Logger.info(f"Backend API: http://localhost:{BACKEND_PORT}")
    Logger.info(f"API Documentation: http://localhost:{BACKEND_PORT}/api/docs")
    Logger.info(f"Frontend: http://localhost:{FRONTEND_PORT}")
    Logger.info("")
    Logger.info(f"Logs are available in: {LOGS_DIR}")
    Logger.info("Use 'python start.py stop' to stop all services")

def start_docker():
    """Start the application with Docker Compose"""
    Logger.section("Starting Docker Mode")
    
    Logger.info("Building and starting all services with Docker Compose...")
    
    # Create .env file for docker-compose
    env_content = f"""ENVIRONMENT=development
POSTGRES_PASSWORD=securepassword123
SECRET_KEY=dev-secret-key-change-in-production
JWT_SECRET_KEY=dev-jwt-secret-change-in-production
ANTHROPIC_API_KEY={os.getenv('ANTHROPIC_API_KEY', '')}
STRIPE_SECRET_KEY={os.getenv('STRIPE_SECRET_KEY', '')}
AWS_ACCESS_KEY_ID={os.getenv('AWS_ACCESS_KEY_ID', '')}
AWS_SECRET_ACCESS_KEY={os.getenv('AWS_SECRET_ACCESS_KEY', '')}
AWS_S3_BUCKET={os.getenv('AWS_S3_BUCKET', 'synthos-dev')}
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLIC_KEY={os.getenv('NEXT_PUBLIC_STRIPE_PUBLIC_KEY', '')}
GRAFANA_PASSWORD=admin123
"""
    
    (PROJECT_ROOT / ".env").write_text(env_content)
    
    # Start services
    run_command(["docker-compose", "up", "-d", "--build"], cwd=PROJECT_ROOT)
    
    # Wait for services
    services = [
        ("PostgreSQL", 5432),
        ("Redis", 6379),
        ("Backend API", 8000),
        ("Frontend", 3000)
    ]
    
    for service_name, port in services:
        wait_for_service("localhost", port, service_name)
    
    # Health checks
    time.sleep(5)
    health_check("Backend", "http://localhost:8000/health")
    
    Logger.success("Docker environment started successfully!")
    Logger.info("Backend API: http://localhost:8000")
    Logger.info("API Documentation: http://localhost:8000/api/docs")
    Logger.info("Frontend: http://localhost:3000")
    Logger.info("Flower (Celery Monitor): http://localhost:5555")
    Logger.info("Prometheus: http://localhost:9090")
    Logger.info("Grafana: http://localhost:3001")
    Logger.info("")
    Logger.info("Use 'docker-compose logs -f' to view logs")
    Logger.info("Use 'python start.py stop' to stop all services")

def stop_services():
    """Stop all running services"""
    Logger.section("Stopping All Services")
    
    # Stop Docker containers
    Logger.info("Stopping Docker containers...")
    run_command(["docker-compose", "down"], cwd=PROJECT_ROOT, check=False)
    
    # Stop development containers
    containers = ["synthos-postgres-dev", "synthos-redis-dev"]
    for container in containers:
        run_command(["docker", "stop", container], check=False)
        run_command(["docker", "rm", container], check=False)
    
    # Stop development processes
    if PIDS_FILE.exists():
        Logger.info("Stopping development processes...")
        try:
            with open(PIDS_FILE, "r") as f:
                pids = [int(line.strip()) for line in f if line.strip().isdigit()]
            
            for pid in pids:
                try:
                    os.kill(pid, signal.SIGTERM)
                except ProcessLookupError:
                    pass  # Process already dead
                except Exception as e:
                    Logger.warning(f"Failed to kill process {pid}: {e}")
            
            PIDS_FILE.unlink()
        except Exception as e:
            Logger.warning(f"Error reading PID file: {e}")
    
    Logger.success("All services stopped")

def show_logs():
    """Show service logs"""
    Logger.section("Service Logs")
    
    # Development logs
    backend_log = LOGS_DIR / "backend.log"
    frontend_log = LOGS_DIR / "frontend.log"
    
    if backend_log.exists() or frontend_log.exists():
        Logger.info("Development logs:")
        
        if backend_log.exists():
            print(f"\n{Colors.YELLOW}Backend logs (last 20 lines):{Colors.NC}")
            with open(backend_log, "r") as f:
                lines = f.readlines()
                for line in lines[-20:]:
                    print(line.rstrip())
        
        if frontend_log.exists():
            print(f"\n{Colors.YELLOW}Frontend logs (last 20 lines):{Colors.NC}")
            with open(frontend_log, "r") as f:
                lines = f.readlines()
                for line in lines[-20:]:
                    print(line.rstrip())
    
    # Docker logs
    if command_exists("docker-compose"):
        try:
            result = run_command(
                ["docker-compose", "ps", "-q"], 
                cwd=PROJECT_ROOT, 
                capture_output=True, 
                check=False
            )
            if result.stdout.strip():
                Logger.info("Docker logs:")
                run_command(["docker-compose", "logs", "--tail=20"], cwd=PROJECT_ROOT, check=False)
        except Exception:
            pass

def check_health():
    """Check the health of all services"""
    Logger.section("Health Check")
    
    services = []
    
    # Check development services
    ports_to_check = [
        ("Backend", BACKEND_PORT),
        ("Frontend", FRONTEND_PORT),
        ("PostgreSQL", POSTGRES_PORT),
        ("Redis", REDIS_PORT)
    ]
    
    for service_name, port in ports_to_check:
        if not port_available(port):
            services.append(f"{service_name}:localhost:{port}")
    
    if not services:
        Logger.warning("No services detected running locally")
        
        # Check Docker services
        if command_exists("docker-compose"):
            try:
                result = run_command(
                    ["docker-compose", "ps"], 
                    cwd=PROJECT_ROOT, 
                    capture_output=True, 
                    check=False
                )
                if result.stdout.strip():
                    Logger.info("Docker services:")
                    print(result.stdout)
            except Exception:
                pass
    else:
        Logger.success(f"Found {len(services)} running services:")
        for service in services:
            print(f"  {Colors.GREEN}✓{Colors.NC} {service}")
        
        # Perform health checks
        if not port_available(BACKEND_PORT):
            health_check("Backend API", f"http://localhost:{BACKEND_PORT}/health")

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Synthos Platform Startup Script",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python start.py dev       # Start development environment
  python start.py docker    # Start with Docker
  python start.py stop      # Stop all services
  python start.py health    # Check service health
        """
    )
    
    parser.add_argument(
        "command",
        nargs="?",
        default="help",
        choices=["dev", "development", "docker", "prod", "production", "stop", "logs", "health", "help"],
        help="Command to execute"
    )
    
    args = parser.parse_args()
    
    show_banner()
    
    try:
        if args.command in ["dev", "development"]:
            if not check_dependencies("dev"):
                sys.exit(1)
            setup_environment()
            start_dev()
        
        elif args.command == "docker":
            if not check_dependencies("docker"):
                sys.exit(1)
            setup_environment()
            start_docker()
        
        elif args.command in ["prod", "production"]:
            Logger.warning("Production mode requires additional configuration!")
            Logger.info("Please ensure you have configured all environment variables, SSL certificates, etc.")
            response = input("Continue with production startup? (y/N): ")
            if response.lower() != 'y':
                Logger.info("Production startup cancelled")
                sys.exit(0)
            
            if not check_dependencies("docker"):
                sys.exit(1)
            
            # Set production environment
            os.environ["ENVIRONMENT"] = "production"
            os.environ["BUILD_TARGET"] = "production"
            os.environ["FRONTEND_BUILD_TARGET"] = "production"
            
            run_command(["docker-compose", "-f", "docker-compose.prod.yml", "up", "-d", "--build"], cwd=PROJECT_ROOT)
            Logger.success("Production environment started!")
        
        elif args.command == "stop":
            stop_services()
        
        elif args.command == "logs":
            show_logs()
        
        elif args.command == "health":
            check_health()
        
        else:  # help
            parser.print_help()
    
    except KeyboardInterrupt:
        Logger.warning("Script interrupted. Run 'python start.py stop' to clean up.")
        sys.exit(1)
    except Exception as e:
        Logger.error(f"An error occurred: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 