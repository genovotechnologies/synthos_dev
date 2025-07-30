#!/usr/bin/env python3
"""
Valkey Connection Test Script
Tests connection to AWS ElastiCache Valkey and provides diagnostics
"""

import os
import sys
import asyncio
import redis.asyncio as redis
import structlog
from dotenv import load_dotenv

# Load environment variables from backend directory
backend_env_path = os.path.join(os.path.dirname(__file__), 'backend', 'backend.env')
if os.path.exists(backend_env_path):
    load_dotenv(backend_env_path)
    print(f"✅ Loaded environment from: {backend_env_path}")
else:
    print(f"⚠️  Environment file not found: {backend_env_path}")
    print("   Using system environment variables")

# Setup logging
structlog.configure(processors=[structlog.processors.TimeStamper(fmt="iso")])
logger = structlog.get_logger()

async def test_network_connectivity(host: str, port: int):
    """Test basic network connectivity to Valkey"""
    import socket
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except Exception as e:
        logger.error(f"Network connectivity test failed: {e}")
        return False

async def test_valkey_connection():
    """Test Valkey connection with detailed diagnostics"""
    
    # Get Valkey configuration from environment
    valkey_url = os.getenv('VALKEY_URL')
    cache_backend = os.getenv('CACHE_BACKEND', 'auto')
    cache_url = os.getenv('CACHE_URL')
    
    print("🔍 Valkey Connection Diagnostics")
    print("=" * 50)
    
    # Configuration check
    print(f"📍 Cache Backend: {cache_backend}")
    print(f"📍 Valkey URL: {valkey_url}")
    print(f"📍 Cache URL: {cache_url}")
    
    # Parse connection details
    if valkey_url:
        if valkey_url.startswith('rediss://'):
            host = valkey_url.split('://')[1].split(':')[0]
            port = int(valkey_url.split(':')[2].split('/')[0])
        elif valkey_url.startswith('redis://'):
            host = valkey_url.split('://')[1].split(':')[0]
            port = int(valkey_url.split(':')[2].split('/')[0])
        else:
            print("❌ Invalid Valkey URL format")
            return False
    elif cache_url:
        if cache_url.startswith('rediss://'):
            host = cache_url.split('://')[1].split(':')[0]
            port = int(cache_url.split(':')[2].split('/')[0])
        elif cache_url.startswith('redis://'):
            host = cache_url.split('://')[1].split(':')[0]
            port = int(cache_url.split(':')[2].split('/')[0])
        else:
            print("❌ Invalid Cache URL format")
            return False
    else:
        print("❌ No Valkey endpoint configured")
        return False
    
    print(f"📍 Host: {host}")
    print(f"📍 Port: {port}")
    
    # Test 1: Network connectivity
    print("\n🌐 Testing network connectivity...")
    if await test_network_connectivity(host, port):
        print("✅ Network connectivity: SUCCESS")
    else:
        print("❌ Network connectivity: FAILED")
        print("   • Check if the endpoint is accessible from your network")
        print("   • Verify security groups allow inbound connections on port 6379")
        return False
    
    # Test 2: Valkey connection
    print("\n🗄️  Testing Valkey connection...")
    
    # Try different connection configurations
    connection_configs = [
        {
            "name": "TLS Connection (rediss://)",
            "url": f"rediss://{host}:{port}/0",
        },
        {
            "name": "Non-TLS Connection (redis://)",
            "url": f"redis://{host}:{port}/0",
        }
    ]
    
    # Add auth token if available
    elasticache_auth_token = os.getenv('AWS_ELASTICACHE_AUTH_TOKEN')
    if elasticache_auth_token:
        connection_configs.append({
            "name": "TLS Connection with Auth",
            "url": f"rediss://:{elasticache_auth_token}@{host}:{port}/0",
        })
    
    for config in connection_configs:
        try:
            print(f"   Trying: {config['name']}")
            
            # Create Valkey client
            valkey_client = redis.from_url(
                config['url'],
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=10,
                socket_timeout=30,
                retry_on_timeout=True,
                health_check_interval=30
            )
            
            # Test connection
            await valkey_client.ping()
            
            # Get Valkey info
            info = await valkey_client.info()
            server_version = info.get('redis_version', 'unknown')
            server_mode = info.get('redis_mode', 'unknown')
            
            print(f"✅ Valkey connection: SUCCESS")
            print(f"   • Server Version: {server_version}")
            print(f"   • Server Mode: {server_mode}")
            print(f"   • Connection URL: {config['url']}")
            
            await valkey_client.close()
            return True
            
        except Exception as e:
            print(f"   ❌ {config['name']} failed: {e}")
            continue
    
    print("\n❌ All Valkey connection attempts failed")
    print("\n💡 Troubleshooting Tips:")
    print("1. Check your AWS ElastiCache endpoint")
    print("2. Verify security groups allow outbound connections")
    print("3. Ensure TLS is properly configured")
    print("4. Check if authentication token is required")
    print("5. Verify the endpoint is in the correct VPC/subnet")
    
    return False

async def main():
    """Main test function"""
    print("🚀 Synthos Valkey Connection Diagnostics")
    print("=" * 50)
    
    if await test_valkey_connection():
        print("\n🎉 SUCCESS: Valkey connection is working!")
        print("   Your backend should now work with Valkey")
    else:
        print("\n⚠️  ISSUE: Valkey connection failed")
        print("   Check your configuration and network settings")

if __name__ == "__main__":
    asyncio.run(main()) 