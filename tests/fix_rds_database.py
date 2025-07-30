#!/usr/bin/env python3
"""
RDS Database Fix Script
Checks available databases and creates the missing synthos database
"""

import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend/backend.env')

def get_connection_to_default_db():
    """Connect to default PostgreSQL database"""
    try:
        # Try connecting to postgres database (default)
        conn_params = {
            'host': 'synthos.cqnoi6g24lpg.us-east-1.rds.amazonaws.com',
            'port': 5432,
            'database': 'postgres',  # Default database
            'user': 'genovo',
            'password': 'genovo2025',
            'sslmode': 'require',
            'connect_timeout': 10
        }
        
        print("🔍 Connecting to default 'postgres' database...")
        conn = psycopg2.connect(**conn_params)
        print("✅ Connected to default database")
        return conn
    except Exception as e:
        print(f"❌ Failed to connect to default database: {e}")
        return None

def list_databases(conn):
    """List all available databases"""
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT datname FROM pg_database WHERE datistemplate = false")
        databases = [row[0] for row in cursor.fetchall()]
        cursor.close()
        
        print("\n📋 Available databases:")
        for db in databases:
            print(f"   • {db}")
        
        return databases
    except Exception as e:
        print(f"❌ Failed to list databases: {e}")
        return []

def create_synthos_database(conn):
    """Create the synthos database"""
    try:
        cursor = conn.cursor()
        
        # Check if synthos database already exists
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = 'synthos'")
        if cursor.fetchone():
            print("✅ Database 'synthos' already exists")
            return True
        
        # Create the database using a separate connection
        print("🔨 Creating 'synthos' database...")
        
        # Create new connection with autocommit for CREATE DATABASE
        create_conn = psycopg2.connect(
            host='synthos.cqnoi6g24lpg.us-east-1.rds.amazonaws.com',
            port=5432,
            database='postgres',
            user='genovo',
            password='genovo2025',
            sslmode='require',
            connect_timeout=10
        )
        create_conn.autocommit = True
        
        create_cursor = create_conn.cursor()
        create_cursor.execute("CREATE DATABASE synthos")
        create_cursor.close()
        create_conn.close()
        
        print("✅ Database 'synthos' created successfully")
        return True
        
    except Exception as e:
        print(f"❌ Failed to create database: {e}")
        return False
    finally:
        cursor.close()

def test_synthos_connection():
    """Test connection to synthos database"""
    try:
        conn_params = {
            'host': 'synthos.cqnoi6g24lpg.us-east-1.rds.amazonaws.com',
            'port': 5432,
            'database': 'synthos',
            'user': 'genovo',
            'password': 'genovo2025',
            'sslmode': 'require',
            'connect_timeout': 10
        }
        
        print("\n🔍 Testing connection to 'synthos' database...")
        conn = psycopg2.connect(**conn_params)
        
        cursor = conn.cursor()
        cursor.execute("SELECT version(), current_database(), current_user")
        result = cursor.fetchone()
        
        print("✅ Synthos database connection: SUCCESS")
        print(f"   PostgreSQL Version: {result[0]}")
        print(f"   Current Database: {result[1]}")
        print(f"   Current User: {result[2]}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Synthos database connection failed: {e}")
        return False

def main():
    """Main function"""
    print("🚀 Synthos RDS Database Fix")
    print("=" * 50)
    
    # Connect to default database
    conn = get_connection_to_default_db()
    if not conn:
        return
    
    try:
        # List available databases
        databases = list_databases(conn)
        
        # Create synthos database if it doesn't exist
        if 'synthos' not in databases:
            if not create_synthos_database(conn):
                return
        else:
            print("✅ Database 'synthos' already exists")
        
        # Test connection to synthos database
        if test_synthos_connection():
            print("\n🎉 SUCCESS: Synthos database is ready!")
            print("   Your application should be able to connect now.")
        else:
            print("\n⚠️  ISSUE: Still cannot connect to synthos database")
            
    finally:
        conn.close()

if __name__ == "__main__":
    main() 