#!/usr/bin/env python3
"""
Local Redis Setup Script
Sets up local Redis for development without Docker
"""

import subprocess
import os
import sys
import platform

def check_redis_installed():
    """Check if Redis is already installed"""
    try:
        result = subprocess.run(['redis-server', '--version'], capture_output=True, text=True)
        return result.returncode == 0
    except FileNotFoundError:
        return False

def install_redis_windows():
    """Install Redis on Windows"""
    print("🔄 Installing Redis on Windows...")
    
    # Check if chocolatey is available
    try:
        result = subprocess.run(['choco', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print("📦 Using Chocolatey to install Redis...")
            subprocess.run(['choco', 'install', 'redis-64', '-y'], check=True)
            return True
    except FileNotFoundError:
        pass
    
    # Check if winget is available
    try:
        result = subprocess.run(['winget', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print("📦 Using winget to install Redis...")
            subprocess.run(['winget', 'install', 'Redis.Redis'], check=True)
            return True
    except FileNotFoundError:
        pass
    
    print("❌ No package manager found (Chocolatey or winget)")
    print("💡 Manual installation required:")
    print("   1. Download Redis for Windows from: https://github.com/microsoftarchive/redis/releases")
    print("   2. Install and add to PATH")
    print("   3. Run: redis-server")
    return False

def install_redis_linux():
    """Install Redis on Linux"""
    print("🔄 Installing Redis on Linux...")
    
    # Try apt (Ubuntu/Debian)
    try:
        subprocess.run(['sudo', 'apt', 'update'], check=True)
        subprocess.run(['sudo', 'apt', 'install', 'redis-server', '-y'], check=True)
        return True
    except subprocess.CalledProcessError:
        pass
    
    # Try yum (CentOS/RHEL)
    try:
        subprocess.run(['sudo', 'yum', 'install', 'redis', '-y'], check=True)
        return True
    except subprocess.CalledProcessError:
        pass
    
    print("❌ Could not install Redis automatically")
    print("💡 Manual installation required:")
    print("   sudo apt install redis-server  # Ubuntu/Debian")
    print("   sudo yum install redis         # CentOS/RHEL")
    return False

def install_redis_macos():
    """Install Redis on macOS"""
    print("🔄 Installing Redis on macOS...")
    
    # Try Homebrew
    try:
        subprocess.run(['brew', 'install', 'redis'], check=True)
        return True
    except subprocess.CalledProcessError:
        pass
    
    print("❌ Could not install Redis automatically")
    print("💡 Manual installation required:")
    print("   brew install redis")
    return False

def start_redis_server():
    """Start Redis server"""
    print("🚀 Starting Redis server...")
    
    try:
        # Start Redis server in background
        if platform.system() == "Windows":
            subprocess.Popen(['redis-server'], creationflags=subprocess.CREATE_NEW_CONSOLE)
        else:
            subprocess.Popen(['redis-server'])
        
        print("✅ Redis server started")
        return True
    except Exception as e:
        print(f"❌ Failed to start Redis server: {e}")
        return False

def test_redis_connection():
    """Test Redis connection"""
    print("🔍 Testing Redis connection...")
    
    try:
        import redis
        r = redis.Redis(host='localhost', port=6379, db=0)
        r.ping()
        print("✅ Redis connection: SUCCESS")
        return True
    except ImportError:
        print("❌ Redis Python package not installed")
        print("💡 Install with: pip install redis")
        return False
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        return False

def update_backend_config():
    """Update backend configuration for local Redis"""
    print("🔧 Updating backend configuration...")
    
    # Read current backend.env
    with open('backend/backend.env', 'r') as f:
        content = f.read()
    
    # Update Redis configuration for local development
    updates = {
        'REDIS_URL=rediss://synthos-33lvyw.serverless.use1.cache.amazonaws.com:6379': 
        'REDIS_URL=redis://localhost:6379/0',
        'CACHE_URL=rediss://synthos-33lvyw.serverless.use1.cache.amazonaws.com:6379': 
        'CACHE_URL=redis://localhost:6379/0'
    }
    
    for old, new in updates.items():
        if old in content:
            content = content.replace(old, new)
    
    # Write updated configuration
    with open('backend/backend.env', 'w') as f:
        f.write(content)
    
    print("✅ Backend configuration updated for local Redis")

def main():
    """Main function"""
    print("🚀 Synthos Local Redis Setup")
    print("=" * 40)
    
    # Check if Redis is already installed
    if check_redis_installed():
        print("✅ Redis is already installed")
    else:
        print("📦 Installing Redis...")
        
        system = platform.system()
        if system == "Windows":
            success = install_redis_windows()
        elif system == "Linux":
            success = install_redis_linux()
        elif system == "Darwin":  # macOS
            success = install_redis_macos()
        else:
            print(f"❌ Unsupported operating system: {system}")
            return
        
        if not success:
            print("❌ Redis installation failed")
            return
    
    # Start Redis server
    if not start_redis_server():
        print("❌ Failed to start Redis server")
        return
    
    # Test connection
    if not test_redis_connection():
        print("❌ Redis connection test failed")
        return
    
    # Update backend configuration
    update_backend_config()
    
    print("\n🎉 SUCCESS: Local Redis is ready!")
    print("\n📋 Next Steps:")
    print("1. Start your backend: cd backend && python -m uvicorn app.main:app --reload")
    print("2. Your application will now use local Redis")
    print("3. For production, fix the ElastiCache security group")

if __name__ == "__main__":
    main() 