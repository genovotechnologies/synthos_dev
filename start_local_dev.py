#!/usr/bin/env python3
"""
Local Development Setup Script
Quickly sets up local PostgreSQL and Redis for development
"""

import subprocess
import sys
import os
import time
import psycopg2
import redis
from pathlib import Path

def check_docker():
    """Check if Docker is available"""
    try:
        result = subprocess.run(['docker', '--version'], capture_output=True, text=True)
        return result.returncode == 0
    except FileNotFoundError:
        return False

def start_local_services():
    """Start local PostgreSQL and Redis using Docker"""
    print("🐳 Starting local services with Docker...")
    
    # Create docker-compose override for local development
    docker_compose_local = """
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: synthos_db
      POSTGRES_USER: synthos
      POSTGRES_PASSWORD: securepassword123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U synthos -d synthos_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
"""
    
    # Write docker-compose override
    with open('docker-compose.local.yml', 'w') as f:
        f.write(docker_compose_local)
    
    # Start services
    try:
        subprocess.run(['docker-compose', '-f', 'docker-compose.local.yml', 'up', '-d'], check=True)
        print("✅ Local services started successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to start services: {e}")
        return False

def wait_for_services():
    """Wait for services to be ready"""
    print("⏳ Waiting for services to be ready...")
    
    # Wait for PostgreSQL
    for i in range(30):
        try:
            conn = psycopg2.connect(
                host='localhost',
                port=5432,
                database='synthos_db',
                user='synthos',
                password='securepassword123'
            )
            conn.close()
            print("✅ PostgreSQL is ready")
            break
        except Exception:
            if i == 29:
                print("❌ PostgreSQL failed to start")
                return False
            time.sleep(2)
    
    # Wait for Redis
    for i in range(30):
        try:
            r = redis.Redis(host='localhost', port=6379, db=0)
            r.ping()
            print("✅ Redis is ready")
            break
        except Exception:
            if i == 29:
                print("❌ Redis failed to start")
                return False
            time.sleep(2)
    
    return True

def test_connection():
    """Test database connection"""
    print("\n🔍 Testing local database connection...")
    
    try:
        conn = psycopg2.connect(
            host='localhost',
            port=5432,
            database='synthos_db',
            user='synthos',
            password='securepassword123'
        )
        
        cursor = conn.cursor()
        cursor.execute("SELECT version(), current_database(), current_user")
        result = cursor.fetchone()
        
        print("✅ Local database connection: SUCCESS")
        print(f"   PostgreSQL Version: {result[0]}")
        print(f"   Current Database: {result[1]}")
        print(f"   Current User: {result[2]}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Local database connection failed: {e}")
        return False

def main():
    """Main function"""
    print("🚀 Synthos Local Development Setup")
    print("=" * 50)
    
    # Check if Docker is available
    if not check_docker():
        print("❌ Docker is not available")
        print("   Please install Docker Desktop and try again")
        return
    
    # Start services
    if not start_local_services():
        return
    
    # Wait for services
    if not wait_for_services():
        return
    
    # Test connection
    if not test_connection():
        return
    
    print("\n🎉 SUCCESS: Local development environment is ready!")
    print("\n📋 Next Steps:")
    print("1. Copy backend.env.local to backend/.env")
    print("2. Start the backend: cd backend && python -m uvicorn app.main:app --reload")
    print("3. Start the frontend: cd frontend && npm run dev")
    print("\n🔗 Services:")
    print("   • Backend API: http://localhost:8000")
    print("   • Frontend: http://localhost:3000")
    print("   • API Docs: http://localhost:8000/api/docs")
    print("   • Health Check: http://localhost:8000/health")

if __name__ == "__main__":
    main() 