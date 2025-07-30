#!/usr/bin/env python3
"""
Redis Connection Test Script
Tests connection to AWS ElastiCache Redis and provides diagnostics
"""

import redis.asyncio as redis
import socket
import time
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend/backend.env')

def test_network_connectivity(host, port):
    """Test basic network connectivity to Redis"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except Exception as e:
        print(f"❌ Network connectivity test failed: {e}")
        return False

async def test_redis_connection():
    """Test Redis connection with detailed diagnostics"""
    
    # Get Redis configuration from environment
    redis_url = os.getenv('REDIS_URL')
    cache_url = os.getenv('CACHE_URL')
    elasticache_endpoint = os.getenv('AWS_ELASTICACHE_ENDPOINT')
    elasticache_port = int(os.getenv('AWS_ELASTICACHE_PORT', '6379'))
    elasticache_use_tls = os.getenv('AWS_ELASTICACHE_USE_TLS', 'true').lower() == 'true'
    elasticache_auth_token = os.getenv('AWS_ELASTICACHE_AUTH_TOKEN')
    
    print("🔍 Redis Connection Diagnostics")
    print("=" * 50)
    print(f"📍 Redis URL: {redis_url}")
    print(f"🔗 Cache URL: {cache_url}")
    print(f"🌐 ElastiCache Endpoint: {elasticache_endpoint}")
    print(f"🔌 Port: {elasticache_port}")
    print(f"🔐 Use TLS: {elasticache_use_tls}")
    print(f"🔑 Auth Token: {'Set' if elasticache_auth_token else 'Not set'}")
    
    # Determine which endpoint to test
    if elasticache_endpoint:
        host = elasticache_endpoint
        port = elasticache_port
    elif redis_url:
        # Parse Redis URL
        if redis_url.startswith('redis://'):
            host = redis_url.split('://')[1].split(':')[0]
            port = int(redis_url.split(':')[2].split('/')[0])
        elif redis_url.startswith('rediss://'):
            host = redis_url.split('://')[1].split(':')[0]
            port = int(redis_url.split(':')[2].split('/')[0])
        else:
            print("❌ Invalid Redis URL format")
            return False
    else:
        print("❌ No Redis endpoint configured")
        return False
    
    print(f"\n🎯 Testing connection to: {host}:{port}")
    
    # Test 1: Network connectivity
    print("\n🌐 Testing network connectivity...")
    if test_network_connectivity(host, port):
        print("✅ Network connectivity: OK")
    else:
        print("❌ Network connectivity: FAILED")
        print("   This could indicate:")
        print("   - ElastiCache cluster is not accessible")
        print("   - Security group blocking connection")
        print("   - Network/VPC issues")
        return False
    
    # Test 2: Redis connection
    print("\n🗄️  Testing Redis connection...")
    
    # Try different connection configurations
    connection_configs = [
        {
            "name": "Direct connection (no auth)",
            "url": f"redis://{host}:{port}/0",
            "config": {}
        },
        {
            "name": "TLS connection (no auth)",
            "url": f"rediss://{host}:{port}/0",
            "config": {}
        }
    ]
    
    # Add auth token configuration if available
    if elasticache_auth_token:
        connection_configs.append({
            "name": "TLS connection with auth",
            "url": f"rediss://:{elasticache_auth_token}@{host}:{port}/0",
            "config": {}
        })
    
    for config in connection_configs:
        try:
            print(f"\n   Trying: {config['name']}")
            print(f"   URL: {config['url']}")
            
            # Create Redis client
            redis_client = redis.from_url(
                config['url'],
                decode_responses=True,
                socket_connect_timeout=10,
                socket_timeout=10,
                retry_on_timeout=True,
                health_check_interval=30,
                **config['config']
            )
            
            # Test connection
            await redis_client.ping()
            
            # Get Redis info
            info = await redis_client.info()
            server_version = info.get('redis_version', 'unknown')
            
            print(f"✅ Redis connection: SUCCESS")
            print(f"   Server Version: {server_version}")
            print(f"   Connection Type: {config['name']}")
            
            await redis_client.close()
            return True
            
        except Exception as e:
            print(f"❌ Redis connection failed: {e}")
            continue
    
    print("\n❌ All Redis connection attempts failed")
    return False

def check_elasticache_status():
    """Provide ElastiCache status information"""
    print("\n📊 ElastiCache Status Information")
    print("=" * 50)
    print("Based on your configuration:")
    print("   • Endpoint: synthos-33lvyw.serverless.use1.cache.amazonaws.com")
    print("   • Type: Serverless Redis")
    print("   • Region: us-east-1")
    print("   • TLS: Enabled")
    print("   • Auth Token: Not configured")
    
    print("\n🔧 Recommended Actions:")
    print("1. Check AWS ElastiCache console for cluster status")
    print("2. Verify security group allows connections from your IP")
    print("3. Check if auth token is required for this cluster")
    print("4. Consider using local Redis for development")

async def main():
    """Main diagnostic function"""
    print("🚀 Synthos Redis Connection Diagnostics")
    print("=" * 60)
    
    # Check ElastiCache status first
    check_elasticache_status()
    
    # Test connection
    if await test_redis_connection():
        print("\n🎉 SUCCESS: Redis connection is working!")
        print("   Your application should be able to connect now.")
    else:
        print("\n⚠️  ISSUE: Redis connection failed")
        print("   This could be due to:")
        print("   - ElastiCache cluster not accessible")
        print("   - Missing authentication token")
        print("   - Network connectivity issues")
        print("\n💡 Quick Fix: Use local Redis for development")
        print("   Run: docker run -d -p 6379:6379 redis:7-alpine")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main()) 