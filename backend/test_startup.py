#!/usr/bin/env python3
# TODO: Implement advanced backend startup tests
"""
Simple test script to verify backend startup
"""

import sys
import os

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

# Also add the parent directory to handle relative imports
parent_dir = os.path.dirname(backend_dir)
sys.path.insert(0, parent_dir)

def test_imports():
    """Test if all required modules can be imported"""
    try:
        print("Testing imports...")
        
        # Test core modules
        from app.core.config import settings
        print("✅ Config imported")
        
        from app.core.database import create_tables
        print("✅ Database imported")
        
        from app.core.redis import init_redis
        print("✅ Redis imported")
        
        from app.api.routes import api_router
        print("✅ API routes imported")
        
        from app.main import app
        print("✅ Main app imported")
        
        print("✅ All imports successful!")
        return True
        
    except Exception as e:
        print(f"❌ Import error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_app_creation():
    """Test if the FastAPI app can be created"""
    try:
        from app.main import app
        print(f"✅ App created successfully")
        print(f"   Title: {app.title}")
        print(f"   Version: {app.version}")
        print(f"   Routes: {len(app.routes)}")
        return True
    except Exception as e:
        print(f"❌ App creation error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("🚀 Testing Synthos Backend Startup...")
    print("=" * 50)
    
    # Test imports
    if not test_imports():
        print("❌ Import tests failed")
        return False
    
    # Test app creation
    if not test_app_creation():
        print("❌ App creation failed")
        return False
    
    print("=" * 50)
    print("✅ All tests passed! Backend is ready to start.")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 