#!/usr/bin/env python3
"""
RDS Status Monitor
Monitors RDS instance status and notifies when maintenance is complete
"""

import time
import subprocess
import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend/backend.env')

def test_rds_connection():
    """Test RDS connection"""
    try:
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            return False
            
        conn = psycopg2.connect(database_url, connect_timeout=5)
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
        conn.close()
        return True
    except Exception:
        return False

def test_rds_proxy_connection():
    """Test RDS Proxy connection"""
    try:
        proxy_endpoint = os.getenv('RDS_PROXY_ENDPOINT')
        rds_port = int(os.getenv('AWS_RDS_PORT', '5432'))
        rds_database = os.getenv('AWS_RDS_DATABASE')
        rds_username = os.getenv('AWS_RDS_USERNAME')
        rds_password = os.getenv('AWS_RDS_PASSWORD')
        
        if not all([proxy_endpoint, rds_database, rds_username, rds_password]):
            return False
            
        conn = psycopg2.connect(
            host=proxy_endpoint,
            port=rds_port,
            database=rds_database,
            user=rds_username,
            password=rds_password,
            sslmode='require',
            connect_timeout=5
        )
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
        conn.close()
        return True
    except Exception:
        return False

def monitor_rds():
    """Monitor RDS status"""
    print("🔍 Monitoring RDS connection status...")
    print("   Press Ctrl+C to stop monitoring")
    print("=" * 50)
    
    start_time = time.time()
    check_count = 0
    
    while True:
        check_count += 1
        current_time = time.strftime("%H:%M:%S")
        elapsed = int(time.time() - start_time)
        
        print(f"[{current_time}] Check #{check_count} (elapsed: {elapsed}s)")
        
        # Test direct RDS connection
        if test_rds_connection():
            print("✅ RDS Direct Connection: SUCCESS")
            print("🎉 RDS maintenance is complete!")
            print("   Your application should work now.")
            return True
        
        # Test RDS Proxy connection
        if test_rds_proxy_connection():
            print("✅ RDS Proxy Connection: SUCCESS")
            print("🎉 RDS Proxy is working!")
            print("   You can use the proxy endpoint.")
            return True
        
        print("❌ RDS connections still failing (maintenance in progress)")
        print("   Waiting 30 seconds before next check...")
        print("-" * 30)
        
        time.sleep(30)

def main():
    """Main function"""
    print("🚀 Synthos RDS Status Monitor")
    print("=" * 50)
    print("This script will monitor your RDS instance status")
    print("and notify you when maintenance is complete.")
    print()
    
    try:
        monitor_rds()
    except KeyboardInterrupt:
        print("\n⏹️  Monitoring stopped by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    main() 