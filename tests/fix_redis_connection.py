#!/usr/bin/env python3
"""
Redis Connection Fix Script
Fixes Redis connection issues by setting up local Redis or updating configuration
"""

import subprocess
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend/backend.env')

def check_docker():
    """Check if Docker is available"""
    try:
        result = subprocess.run(['docker', '--version'], capture_output=True, text=True)
        return result.returncode == 0
    except FileNotFoundError:
        return False

def start_local_redis():
    """Start local Redis using Docker"""
    print("🐳 Starting local Redis with Docker...")
    
    try:
        # Stop any existing Redis container
        subprocess.run(['docker', 'stop', 'synthos-redis'], capture_output=True)
        subprocess.run(['docker', 'rm', 'synthos-redis'], capture_output=True)
        
        # Start new Redis container
        result = subprocess.run([
            'docker', 'run', '-d',
            '--name', 'synthos-redis',
            '-p', '6379:6379',
            'redis:7-alpine'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Local Redis started successfully")
            return True
        else:
            print(f"❌ Failed to start Redis: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Error starting Redis: {e}")
        return False

def update_backend_env_for_local():
    """Update backend.env to use local Redis"""
    print("🔧 Updating backend configuration for local Redis...")
    
    # Read current backend.env
    with open('backend/backend.env', 'r') as f:
        content = f.read()
    
    # Update Redis configuration for local development
    updates = {
        'REDIS_URL=rediss://synthos-33lvyw.serverless.use1.cache.amazonaws.com:6379': 
        'REDIS_URL=redis://localhost:6379/0',
        'CACHE_URL=rediss://synthos-33lvyw.serverless.use1.cache.amazonaws.com:6379': 
        'CACHE_URL=redis://localhost:6379/0',
        'CACHE_BACKEND=redis': 
        'CACHE_BACKEND=redis',
        'AWS_ELASTICACHE_ENDPOINT=synthos-33lvyw.serverless.use1.cache.amazonaws.com': 
        '# AWS_ELASTICACHE_ENDPOINT=synthos-33lvyw.serverless.use1.cache.amazonaws.com  # Commented for local dev',
        'AWS_ELASTICACHE_USE_TLS=true': 
        'AWS_ELASTICACHE_USE_TLS=false  # Disabled for local dev'
    }
    
    for old, new in updates.items():
        if old in content:
            content = content.replace(old, new)
    
    # Write updated configuration
    with open('backend/backend.env', 'w') as f:
        f.write(content)
    
    print("✅ Backend configuration updated for local Redis")

def test_local_redis():
    """Test local Redis connection"""
    print("🔍 Testing local Redis connection...")
    
    try:
        import redis
        r = redis.Redis(host='localhost', port=6379, db=0)
        r.ping()
        print("✅ Local Redis connection: SUCCESS")
        return True
    except Exception as e:
        print(f"❌ Local Redis connection failed: {e}")
        return False

def provide_elasticache_fix_instructions():
    """Provide instructions for fixing ElastiCache security group"""
    print("\n🔧 ElastiCache Security Group Fix Instructions")
    print("=" * 60)
    print("To fix the ElastiCache connection issue:")
    print()
    print("1. Go to AWS ElastiCache Console")
    print("2. Select your 'synthos' cluster")
    print("3. Click on 'Connectivity and security' tab")
    print("4. Click on the security group: sg-055272d8b0f14976e")
    print("5. Add an inbound rule:")
    print("   - Type: Custom TCP")
    print("   - Port: 6379")
    print("   - Source: Your IP address (or 0.0.0.0/0 for testing)")
    print("   - Description: Redis access from development")
    print()
    print("6. After adding the rule, update backend.env:")
    print("   REDIS_URL=rediss://synthos-33lvyw.serverless.use1.cache.amazonaws.com:6379")
    print("   CACHE_URL=rediss://synthos-33lvyw.serverless.use1.cache.amazonaws.com:6379")
    print()
    print("7. Restart your backend application")

def main():
    """Main function"""
    print("🚀 Synthos Redis Connection Fix")
    print("=" * 50)
    
    # Check if Docker is available
    if not check_docker():
        print("❌ Docker is not available")
        print("   Please install Docker Desktop and try again")
        print("\n💡 Alternative: Fix ElastiCache security group")
        provide_elasticache_fix_instructions()
        return
    
    print("📋 Options:")
    print("1. Use local Redis (recommended for development)")
    print("2. Fix ElastiCache security group (for production)")
    print()
    
    choice = input("Choose option (1 or 2): ").strip()
    
    if choice == "1":
        print("\n🔄 Setting up local Redis...")
        
        # Start local Redis
        if not start_local_redis():
            print("❌ Failed to start local Redis")
            return
        
        # Update configuration
        update_backend_env_for_local()
        
        # Test connection
        if test_local_redis():
            print("\n🎉 SUCCESS: Local Redis is ready!")
            print("\n📋 Next Steps:")
            print("1. Start your backend: cd backend && python -m uvicorn app.main:app --reload")
            print("2. Your application will now use local Redis")
            print("3. For production, fix the ElastiCache security group")
        else:
            print("❌ Local Redis test failed")
    
    elif choice == "2":
        print("\n📖 ElastiCache Security Group Fix Instructions")
        provide_elasticache_fix_instructions()
    
    else:
        print("❌ Invalid choice. Please run the script again.")

if __name__ == "__main__":
    main() 