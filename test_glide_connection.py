#!/usr/bin/env python3
"""
Test ElastiCache Connection with Valkey GLIDE
Uses the recommended GLIDE client library for ElastiCache
"""

import asyncio
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend/backend.env')

async def test_glide_connection():
    """Test ElastiCache connection using GLIDE client"""
    print("🔍 Testing ElastiCache connection with GLIDE client...")
    
    try:
        # Try to import GLIDE
        from valkey_glide import GlideClusterClient, GlideClusterClientConfiguration, NodeAddress
        
        print("✅ GLIDE client imported successfully")
        
        # Configure connection
        addresses = [
            NodeAddress("synthos-33lvyw.serverless.use1.cache.amazonaws.com", 6379)
        ]
        config = GlideClusterClientConfiguration(addresses=addresses, use_tls=True)
        
        print("🔧 Creating GLIDE client...")
        client = await GlideClusterClient.create(config)
        
        print("🔍 Testing connection...")
        
        # Test PING
        ping_response = await client.ping()
        print(f"✅ PING response: {ping_response}")
        
        # Test SET/GET
        result = await client.set("test_key", "test_value")
        print(f"✅ SET result: {result}")
        
        value = await client.get("test_key")
        print(f"✅ GET result: {value}")
        
        # Close connection
        await client.close()
        
        print("🎉 GLIDE connection test: SUCCESS")
        return True
        
    except ImportError:
        print("❌ GLIDE client not installed")
        print("💡 Install with: pip install valkey-glide")
        return False
    except Exception as e:
        print(f"❌ GLIDE connection failed: {e}")
        return False

def install_glide():
    """Install GLIDE client"""
    print("📦 Installing GLIDE client...")
    
    import subprocess
    try:
        result = subprocess.run(['pip', 'install', 'valkey-glide'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ GLIDE client installed successfully")
            return True
        else:
            print(f"❌ Failed to install GLIDE: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Installation error: {e}")
        return False

def update_backend_for_glide():
    """Update backend to use GLIDE client"""
    print("🔧 Updating backend configuration for GLIDE...")
    
    # Read current backend.env
    with open('backend/backend.env', 'r') as f:
        content = f.read()
    
    # Add GLIDE configuration
    glide_config = '''
# GLIDE Client Configuration (recommended for ElastiCache)
USE_GLIDE_CLIENT=true
GLIDE_ENDPOINT=synthos-33lvyw.serverless.use1.cache.amazonaws.com
GLIDE_PORT=6379
GLIDE_USE_TLS=true
'''
    
    if 'USE_GLIDE_CLIENT=true' not in content:
        content += glide_config
    
    # Write updated configuration
    with open('backend/backend.env', 'w') as f:
        f.write(content)
    
    print("✅ Backend configuration updated for GLIDE")

def provide_glide_instructions():
    """Provide GLIDE installation and usage instructions"""
    print("\n📋 GLIDE Client Instructions")
    print("=" * 40)
    print("AWS recommends using Valkey GLIDE for ElastiCache connections.")
    print()
    print("1. Install GLIDE client:")
    print("   pip install valkey-glide")
    print()
    print("2. Update your backend code to use GLIDE:")
    print("   from valkey_glide import GlideClusterClient, GlideClusterClientConfiguration, NodeAddress")
    print()
    print("3. Configure connection:")
    print("   addresses = [NodeAddress('synthos-33lvyw.serverless.use1.cache.amazonaws.com', 6379)]")
    print("   config = GlideClusterClientConfiguration(addresses=addresses, use_tls=True)")
    print("   client = await GlideClusterClient.create(config)")
    print()
    print("4. Use the client:")
    print("   await client.set('key', 'value')")
    print("   value = await client.get('key')")
    print("   await client.close()")

def main():
    """Main function"""
    print("🚀 ElastiCache GLIDE Connection Test")
    print("=" * 50)
    
    # Check if GLIDE is installed
    try:
        from valkey_glide import GlideClusterClient
        print("✅ GLIDE client already installed")
    except ImportError:
        print("📦 GLIDE client not found, installing...")
        if not install_glide():
            print("❌ Failed to install GLIDE")
            provide_glide_instructions()
            return
    
    # Test GLIDE connection
    if asyncio.run(test_glide_connection()):
        print("\n🎉 SUCCESS: ElastiCache connection working with GLIDE!")
        print("📋 Next Steps:")
        print("1. Update your backend code to use GLIDE client")
        print("2. Start your backend: cd backend && python -m uvicorn app.main:app --reload")
        
        # Update backend configuration
        update_backend_for_glide()
    else:
        print("\n⚠️  GLIDE connection failed")
        print("   This could be due to:")
        print("   - Security group still not configured properly")
        print("   - Network connectivity issues")
        print("   - ElastiCache cluster status")
        
        provide_glide_instructions()

if __name__ == "__main__":
    main() 