#!/usr/bin/env python3
"""
RDS Connection Test Script
Tests connection to AWS RDS database and provides diagnostics
"""

import psycopg2
import time
import socket
from urllib.parse import urlparse
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend/backend.env')

def test_network_connectivity(host, port):
    """Test basic network connectivity"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except Exception as e:
        print(f"❌ Network connectivity test failed: {e}")
        return False

def test_database_connection():
    """Test database connection with detailed diagnostics"""
    
    # Get connection details from environment
    database_url = os.getenv('DATABASE_URL')
    rds_endpoint = os.getenv('AWS_RDS_ENDPOINT')
    rds_port = int(os.getenv('AWS_RDS_PORT', '5432'))
    rds_database = os.getenv('AWS_RDS_DATABASE')
    rds_username = os.getenv('AWS_RDS_USERNAME')
    
    print("🔍 RDS Connection Diagnostics")
    print("=" * 50)
    
    # Parse connection details
    if database_url:
        parsed = urlparse(database_url)
        host = parsed.hostname
        port = parsed.port or 5432
        database = parsed.path.lstrip('/')
        username = parsed.username
    else:
        host = rds_endpoint
        port = rds_port
        database = rds_database
        username = rds_username
    
    print(f"📍 Host: {host}")
    print(f"🔌 Port: {port}")
    print(f"🗄️  Database: {database}")
    print(f"👤 Username: {username}")
    print(f"🔐 SSL Required: {os.getenv('AWS_RDS_USE_SSL', 'true')}")
    
    # Test 1: Network connectivity
    print("\n🌐 Testing network connectivity...")
    if test_network_connectivity(host, port):
        print("✅ Network connectivity: OK")
    else:
        print("❌ Network connectivity: FAILED")
        print("   This could indicate:")
        print("   - RDS instance is in maintenance mode")
        print("   - Security group blocking connection")
        print("   - Network/VPC issues")
        return False
    
    # Test 2: Database connection
    print("\n🗄️  Testing database connection...")
    try:
        # Try with SSL first
        conn_params = {
            'host': host,
            'port': port,
            'database': database,
            'user': username,
            'password': os.getenv('AWS_RDS_PASSWORD') or 'genovo2025',
            'sslmode': 'require',
            'connect_timeout': 10
        }
        
        print("   Attempting connection with SSL...")
        conn = psycopg2.connect(**conn_params)
        
        # Test query
        cursor = conn.cursor()
        cursor.execute("SELECT version(), current_database(), current_user")
        result = cursor.fetchone()
        
        print("✅ Database connection: SUCCESS")
        print(f"   PostgreSQL Version: {result[0]}")
        print(f"   Current Database: {result[1]}")
        print(f"   Current User: {result[2]}")
        
        cursor.close()
        conn.close()
        return True
        
    except psycopg2.OperationalError as e:
        print(f"❌ Database connection failed: {e}")
        
        # Try without SSL
        print("\n   Attempting connection without SSL...")
        try:
            conn_params['sslmode'] = 'disable'
            conn = psycopg2.connect(**conn_params)
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
            print("✅ Database connection (no SSL): SUCCESS")
            cursor.close()
            conn.close()
            return True
        except Exception as e2:
            print(f"❌ Database connection (no SSL) failed: {e2}")
            
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
    
    return False

def check_rds_status():
    """Provide RDS status information"""
    print("\n📊 RDS Status Information")
    print("=" * 50)
    print("Based on your AWS console screenshot:")
    print("   • Instance: synthos")
    print("   • Status: Maintenance (this is the issue!)")
    print("   • Engine: PostgreSQL")
    print("   • Class: db.m7g.large")
    print("   • Publicly Accessible: Yes")
    print("   • Endpoint: synthos.cqnoi6g24lpg.us-east-1.rds.amazonaws.com")
    
    print("\n🔧 Recommended Actions:")
    print("1. Wait for maintenance to complete (15-30 minutes)")
    print("2. Check AWS RDS console for maintenance status updates")
    print("3. Verify security group allows connections from your IP")
    print("4. Test connection again after maintenance completes")

def main():
    """Main diagnostic function"""
    print("🚀 Synthos RDS Connection Diagnostics")
    print("=" * 60)
    
    # Check RDS status first
    check_rds_status()
    
    # Test connection
    if test_database_connection():
        print("\n🎉 SUCCESS: Database connection is working!")
        print("   Your application should be able to connect now.")
    else:
        print("\n⚠️  ISSUE: Database connection failed")
        print("   This is likely due to the maintenance status.")
        print("   Please wait for maintenance to complete and try again.")

if __name__ == "__main__":
    main() 