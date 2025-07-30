#!/usr/bin/env python3
"""
Quick Redis Fix Script
Temporarily disables Redis to allow backend to start
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend/backend.env')

def create_redis_disabled_config():
    """Create a backend configuration that disables Redis temporarily"""
    print("🔧 Creating Redis-disabled configuration...")
    
    # Read current backend.env
    with open('backend/backend.env', 'r') as f:
        content = f.read()
    
    # Add Redis disable flag
    redis_disable_line = "\n# TEMPORARY: Disable Redis for development\nREDIS_DISABLED=true\n"
    
    if 'REDIS_DISABLED=true' not in content:
        content += redis_disable_line
    
    # Write updated configuration
    with open('backend/backend.env', 'w') as f:
        f.write(content)
    
    print("✅ Redis disabled in configuration")

def modify_redis_init():
    """Modify the Redis initialization to handle disabled state"""
    print("🔧 Modifying Redis initialization...")
    
    # Read the Redis module
    with open('backend/app/core/redis.py', 'r') as f:
        content = f.read()
    
    # Add disabled check at the beginning of init_redis function
    disabled_check = '''async def init_redis():
    """Initialize Redis/Valkey connection pool"""
    global redis_pool, redis_client
    
    # Check if Redis is disabled
    if os.getenv('REDIS_DISABLED', 'false').lower() == 'true':
        logger.warning("Redis is disabled - using in-memory fallback")
        return
    
    try:'''
    
    # Replace the existing init_redis function
    if 'async def init_redis():' in content:
        # Find the start of the function
        start = content.find('async def init_redis():')
        # Find the end of the function (look for the next function or end of file)
        end = content.find('\n\n', start)
        if end == -1:
            end = len(content)
        
        # Replace the function
        new_content = content[:start] + disabled_check + content[end:]
        
        with open('backend/app/core/redis.py', 'w') as f:
            f.write(new_content)
        
        print("✅ Redis initialization modified")
    else:
        print("⚠️  Could not modify Redis initialization")

def provide_manual_instructions():
    """Provide manual Redis installation instructions"""
    print("\n📋 Manual Redis Installation Instructions")
    print("=" * 50)
    print("Since automatic installation failed, here are manual options:")
    print()
    print("Option 1: Install Redis for Windows")
    print("1. Download Redis for Windows from:")
    print("   https://github.com/microsoftarchive/redis/releases")
    print("2. Download the latest .msi file")
    print("3. Install and add to PATH")
    print("4. Run: redis-server")
    print()
    print("Option 2: Use WSL (Windows Subsystem for Linux)")
    print("1. Install WSL: wsl --install")
    print("2. Open WSL terminal")
    print("3. Run: sudo apt update && sudo apt install redis-server")
    print("4. Run: sudo service redis-server start")
    print()
    print("Option 3: Fix ElastiCache Security Group")
    print("1. Go to AWS ElastiCache Console")
    print("2. Select 'synthos' cluster")
    print("3. Click 'Connectivity and security'")
    print("4. Click security group: sg-055272d8b0f14976e")
    print("5. Add inbound rule: Custom TCP, Port 6379, Source: Your IP")
    print()
    print("Option 4: Use Redis Cloud (Free tier)")
    print("1. Go to https://redis.com/try-free/")
    print("2. Create free account")
    print("3. Get connection string")
    print("4. Update REDIS_URL in backend.env")

def main():
    """Main function"""
    print("🚀 Quick Redis Fix")
    print("=" * 30)
    
    # Create Redis-disabled configuration
    create_redis_disabled_config()
    
    # Modify Redis initialization
    modify_redis_init()
    
    print("\n✅ Quick fix applied!")
    print("📋 Your backend should now start without Redis")
    print("   Run: cd backend && python -m uvicorn app.main:app --reload")
    print()
    print("💡 For full Redis functionality, choose one of these options:")
    
    # Provide manual instructions
    provide_manual_instructions()

if __name__ == "__main__":
    main() 