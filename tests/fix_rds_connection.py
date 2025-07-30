#!/usr/bin/env python3
"""
Comprehensive RDS Connection Fix
Fixes DNS, configuration, and connection issues
"""

import psycopg2
import socket
import os
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend/backend.env')

def check_dns_resolution(hostname):
    """Check DNS resolution for hostname"""
    try:
        ip = socket.gethostbyname(hostname)
        print(f"✅ DNS Resolution: {hostname} -> {ip}")
        return True
    except socket.gaierror as e:
        print(f"❌ DNS Resolution failed: {e}")
        return False

def test_direct_connection():
    """Test direct connection to RDS"""
    try:
        print("\n🔍 Testing direct RDS connection...")
        conn = psycopg2.connect(
            host='synthos.cqnoi6g24lpg.us-east-1.rds.amazonaws.com',
            port=5432,
            database='synthos',
            user='genovo',
            password='genovo2025',
            sslmode='require',
            connect_timeout=10
        )
        
        cursor = conn.cursor()
        cursor.execute("SELECT version(), current_database(), current_user")
        result = cursor.fetchone()
        
        print("✅ Direct RDS connection: SUCCESS")
        print(f"   PostgreSQL Version: {result[0]}")
        print(f"   Current Database: {result[1]}")
        print(f"   Current User: {result[2]}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Direct RDS connection failed: {e}")
        return False

def update_environment_config():
    """Update environment configuration"""
    print("\n🔧 Updating environment configuration...")
    
    # Read current backend.env
    with open('backend/backend.env', 'r') as f:
        content = f.read()
    
    # Update configuration
    updates = {
        'USE_RDS_PROXY=false': 'USE_RDS_PROXY=false',
        'AWS_RDS_PASSWORD=genovo2025': 'AWS_RDS_PASSWORD=genovo2025',
        'DATABASE_URL=postgresql://genovo:genovo2025@synthos.cqnoi6g24lpg.us-east-1.rds.amazonaws.com:5432/synthos': 
        'DATABASE_URL=postgresql://genovo:genovo2025@synthos.cqnoi6g24lpg.us-east-1.rds.amazonaws.com:5432/synthos?sslmode=require'
    }
    
    for old, new in updates.items():
        if old in content:
            content = content.replace(old, new)
    
    # Write updated configuration
    with open('backend/backend.env', 'w') as f:
        f.write(content)
    
    print("✅ Environment configuration updated")

def test_backend_connection():
    """Test backend database connection"""
    try:
        print("\n🔍 Testing backend database connection...")
        
        # Set environment variables
        os.environ['USE_RDS_PROXY'] = 'false'
        os.environ['DATABASE_URL'] = 'postgresql://genovo:genovo2025@synthos.cqnoi6g24lpg.us-east-1.rds.amazonaws.com:5432/synthos?sslmode=require'
        
        # Import and test
        import sys
        sys.path.append('.')
        
        from app.core.database import DatabaseManager
        result = DatabaseManager.check_connection()
        
        if result:
            print("✅ Backend database connection: SUCCESS")
            return True
        else:
            print("❌ Backend database connection: FAILED")
            return False
            
    except Exception as e:
        print(f"❌ Backend connection test failed: {e}")
        return False

def main():
    """Main function"""
    print("🚀 Synthos RDS Connection Fix")
    print("=" * 50)
    
    # Step 1: Check DNS resolution
    hostname = 'synthos.cqnoi6g24lpg.us-east-1.rds.amazonaws.com'
    if not check_dns_resolution(hostname):
        print("\n⚠️  DNS resolution failed. This could be due to:")
        print("   - Network connectivity issues")
        print("   - RDS endpoint has changed")
        print("   - AWS region issues")
        return
    
    # Step 2: Test direct connection
    if not test_direct_connection():
        print("\n⚠️  Direct connection failed. Trying alternative approaches...")
        
        # Try different SSL modes
        ssl_modes = ['require', 'prefer', 'allow', 'disable']
        for ssl_mode in ssl_modes:
            try:
                print(f"\n   Trying SSL mode: {ssl_mode}")
                conn = psycopg2.connect(
                    host='synthos.cqnoi6g24lpg.us-east-1.rds.amazonaws.com',
                    port=5432,
                    database='synthos',
                    user='genovo',
                    password='genovo2025',
                    sslmode=ssl_mode,
                    connect_timeout=10
                )
                conn.close()
                print(f"✅ Connection successful with SSL mode: {ssl_mode}")
                break
            except Exception as e:
                print(f"❌ Failed with SSL mode {ssl_mode}: {e}")
        else:
            print("❌ All SSL modes failed")
            return
    
    # Step 3: Update configuration
    update_environment_config()
    
    # Step 4: Test backend connection
    if test_backend_connection():
        print("\n🎉 SUCCESS: RDS connection is fully working!")
        print("   Your Synthos application should now connect properly.")
    else:
        print("\n⚠️  Backend connection still has issues")
        print("   Please check the application logs for more details.")

if __name__ == "__main__":
    main() 