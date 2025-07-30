#!/usr/bin/env python3
"""
Re-enable ElastiCache Configuration
Re-enables ElastiCache after security group update
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend/backend.env')

def re_enable_elasticache():
    """Re-enable ElastiCache configuration"""
    print("🔧 Re-enabling ElastiCache configuration...")
    
    # Read current backend.env
    with open('backend/backend.env', 'r') as f:
        content = f.read()
    
    # Remove Redis disabled flag
    content = content.replace('REDIS_DISABLED=true', '# REDIS_DISABLED=true  # Commented out')
    
    # Ensure ElastiCache URLs are active
    updates = {
        'REDIS_URL=redis://localhost:6379/0': 'REDIS_URL=rediss://synthos-33lvyw.serverless.use1.cache.amazonaws.com:6379',
        'CACHE_URL=redis://localhost:6379/0': 'CACHE_URL=rediss://synthos-33lvyw.serverless.use1.cache.amazonaws.com:6379',
        '# AWS_ELASTICACHE_ENDPOINT=synthos-33lvyw.serverless.use1.cache.amazonaws.com  # Commented for local dev': 
        'AWS_ELASTICACHE_ENDPOINT=synthos-33lvyw.serverless.use1.cache.amazonaws.com',
        'AWS_ELASTICACHE_USE_TLS=false  # Disabled for local dev': 'AWS_ELASTICACHE_USE_TLS=true'
    }
    
    for old, new in updates.items():
        if old in content:
            content = content.replace(old, new)
    
    # Write updated configuration
    with open('backend/backend.env', 'w') as f:
        f.write(content)
    
    print("✅ ElastiCache configuration re-enabled")

def test_different_connection_methods():
    """Test different connection methods to ElastiCache"""
    print("\n🔍 Testing different ElastiCache connection methods...")
    
    import redis.asyncio as redis
    import socket
    
    endpoint = "synthos-33lvyw.serverless.use1.cache.amazonaws.com"
    port = 6379
    
    # Test 1: Basic socket connection
    print("\n1. Testing basic socket connection...")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        result = sock.connect_ex((endpoint, port))
        sock.close()
        
        if result == 0:
            print("✅ Socket connection: SUCCESS")
        else:
            print(f"❌ Socket connection: FAILED (error code: {result})")
            return False
    except Exception as e:
        print(f"❌ Socket connection failed: {e}")
        return False
    
    # Test 2: Redis with TLS
    print("\n2. Testing Redis with TLS...")
    try:
        redis_client = redis.from_url(
            f"rediss://{endpoint}:{port}/0",
            decode_responses=True,
            socket_connect_timeout=10,
            socket_timeout=10,
            retry_on_timeout=True
        )
        
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            loop.run_until_complete(redis_client.ping())
            print("✅ Redis TLS connection: SUCCESS")
            loop.run_until_complete(redis_client.close())
            return True
        except Exception as e:
            print(f"❌ Redis TLS connection failed: {e}")
    except Exception as e:
        print(f"❌ Redis client creation failed: {e}")
    
    # Test 3: Redis without TLS
    print("\n3. Testing Redis without TLS...")
    try:
        redis_client = redis.from_url(
            f"redis://{endpoint}:{port}/0",
            decode_responses=True,
            socket_connect_timeout=10,
            socket_timeout=10,
            retry_on_timeout=True
        )
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            loop.run_until_complete(redis_client.ping())
            print("✅ Redis non-TLS connection: SUCCESS")
            loop.run_until_complete(redis_client.close())
            return True
        except Exception as e:
            print(f"❌ Redis non-TLS connection failed: {e}")
    except Exception as e:
        print(f"❌ Redis client creation failed: {e}")
    
    return False

def provide_security_group_instructions():
    """Provide detailed security group instructions"""
    print("\n🔧 Detailed Security Group Instructions")
    print("=" * 50)
    print("If the connection is still failing, try these steps:")
    print()
    print("1. Go to AWS ElastiCache Console")
    print("2. Select your 'synthos' cluster")
    print("3. Click 'Connectivity and security' tab")
    print("4. Click on security group: sg-055272d8b0f14976e")
    print("5. In the 'Inbound rules' tab, click 'Edit inbound rules'")
    print("6. Click 'Add rule'")
    print("7. Configure the rule:")
    print("   - Type: Custom TCP")
    print("   - Protocol: TCP")
    print("   - Port range: 6379")
    print("   - Source: Custom")
    print("   - Source: 0.0.0.0/0 (for testing) or your specific IP")
    print("   - Description: Redis access")
    print("8. Click 'Save rules'")
    print()
    print("💡 Alternative: Use your specific IP address")
    print("   Find your IP: https://whatismyipaddress.com/")
    print("   Use format: YOUR_IP/32")

def main():
    """Main function"""
    print("🚀 Re-enabling ElastiCache Configuration")
    print("=" * 50)
    
    # Re-enable ElastiCache configuration
    re_enable_elasticache()
    
    # Test different connection methods
    if test_different_connection_methods():
        print("\n🎉 SUCCESS: ElastiCache connection is working!")
        print("📋 Next Steps:")
        print("1. Start your backend: cd backend && python -m uvicorn app.main:app --reload")
        print("2. Your application will now use ElastiCache Redis")
    else:
        print("\n⚠️  ElastiCache connection still failing")
        print("   This could be due to:")
        print("   - Security group not properly configured")
        print("   - Network connectivity issues")
        print("   - ElastiCache cluster status")
        
        # Provide detailed instructions
        provide_security_group_instructions()

if __name__ == "__main__":
    main() 