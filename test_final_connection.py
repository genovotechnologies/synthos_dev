#!/usr/bin/env python3
"""
Final RDS Connection Test
Confirms that the RDS connection is working properly
"""

import os
import sys
from dotenv import load_dotenv

# Set environment variables to force direct connection
os.environ['USE_RDS_PROXY'] = 'false'
os.environ['DATABASE_URL'] = 'postgresql://genovo:genovo2025@18.235.10.180:5432/synthos?sslmode=require'

# Load environment variables
load_dotenv('backend/backend.env')

def test_backend_connection():
    """Test backend database connection"""
    try:
        print("🔍 Testing backend database connection...")
        
        # Add backend to path
        sys.path.append('backend')
        
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

def test_health_endpoint():
    """Test the health endpoint"""
    try:
        print("\n🔍 Testing health endpoint...")
        
        # Add backend to path
        sys.path.append('backend')
        
        from app.main import app
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        response = client.get("/health")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Health endpoint: SUCCESS")
            print(f"   Status: {data.get('status')}")
            print(f"   Database: {data.get('checks', {}).get('database')}")
            print(f"   Redis: {data.get('checks', {}).get('redis')}")
            return True
        else:
            print(f"❌ Health endpoint failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Health endpoint test failed: {e}")
        return False

def main():
    """Main function"""
    print("🚀 Final RDS Connection Test")
    print("=" * 50)
    
    # Test backend connection
    if test_backend_connection():
        print("\n✅ Backend database connection is working!")
    else:
        print("\n❌ Backend database connection failed")
        return
    
    # Test health endpoint
    if test_health_endpoint():
        print("\n✅ Health endpoint is working!")
    else:
        print("\n❌ Health endpoint failed")
        return
    
    print("\n🎉 SUCCESS: Your RDS connection is fully working!")
    print("   Your Synthos application should now be ready to use.")
    print("\n📋 Next Steps:")
    print("1. Start the backend: python -m uvicorn app.main:app --reload")
    print("2. Start the frontend: cd ../frontend && npm run dev")
    print("3. Access your application at http://localhost:3000")

if __name__ == "__main__":
    main() 