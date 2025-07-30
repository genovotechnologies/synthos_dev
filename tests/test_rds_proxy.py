#!/usr/bin/env python3
"""
RDS Proxy Connection Test Script
Tests connection to AWS RDS Proxy as alternative to direct RDS
"""

import psycopg2
import socket
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend/backend.env')

def test_rds_proxy_connection():
    """Test RDS Proxy connection"""
    
    proxy_endpoint = os.getenv('RDS_PROXY_ENDPOINT')
    rds_port = int(os.getenv('AWS_RDS_PORT', '5432'))
    rds_database = os.getenv('AWS_RDS_DATABASE')
    rds_username = os.getenv('AWS_RDS_USERNAME')
    rds_password = os.getenv('AWS_RDS_PASSWORD')
    
    print("🔍 RDS Proxy Connection Test")
    print("=" * 50)
    print(f"📍 Proxy Endpoint: {proxy_endpoint}")
    print(f"🔌 Port: {rds_port}")
    print(f"🗄️  Database: {rds_database}")
    print(f"👤 Username: {rds_username}")
    
    # Test network connectivity to proxy
    print("\n🌐 Testing proxy connectivity...")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        result = sock.connect_ex((proxy_endpoint, rds_port))
        sock.close()
        
        if result == 0:
            print("✅ Proxy connectivity: OK")
        else:
            print("❌ Proxy connectivity: FAILED")
            return False
    except Exception as e:
        print(f"❌ Proxy connectivity test failed: {e}")
        return False
    
    # Test database connection through proxy
    print("\n🗄️  Testing database connection through proxy...")
    try:
        conn_params = {
            'host': proxy_endpoint,
            'port': rds_port,
            'database': rds_database,
            'user': rds_username,
            'password': rds_password,
            'sslmode': 'require',
            'connect_timeout': 10
        }
        
        print("   Attempting connection through proxy...")
        conn = psycopg2.connect(**conn_params)
        
        # Test query
        cursor = conn.cursor()
        cursor.execute("SELECT version(), current_database(), current_user")
        result = cursor.fetchone()
        
        print("✅ Proxy database connection: SUCCESS")
        print(f"   PostgreSQL Version: {result[0]}")
        print(f"   Current Database: {result[1]}")
        print(f"   Current User: {result[2]}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Proxy database connection failed: {e}")
        return False

def main():
    """Main function"""
    print("🚀 Synthos RDS Proxy Connection Test")
    print("=" * 60)
    
    if test_rds_proxy_connection():
        print("\n🎉 SUCCESS: RDS Proxy connection is working!")
        print("   You can use the proxy endpoint instead of direct RDS.")
        print("   Update your DATABASE_URL to use the proxy endpoint.")
    else:
        print("\n⚠️  ISSUE: RDS Proxy connection failed")
        print("   This could be due to:")
        print("   - Proxy not configured properly")
        print("   - RDS instance still in maintenance")
        print("   - Security group issues")

if __name__ == "__main__":
    main() 