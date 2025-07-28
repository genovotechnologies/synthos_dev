#!/usr/bin/env python3
"""
Debug script to test backend startup
"""

import sys
import os

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

# Also add the parent directory to handle relative imports
parent_dir = os.path.dirname(backend_dir)
sys.path.insert(0, parent_dir)

try:
    print("Testing imports...")
    from app.main import app
    print("✅ App imported successfully")
    
    print("Testing app creation...")
    print(f"App title: {app.title}")
    print(f"App version: {app.version}")
    print("✅ App created successfully")
    
    print("Testing routes...")
    routes = [route.path for route in app.routes]
    print(f"Found {len(routes)} routes")
    print("✅ Routes loaded successfully")
    
    print("Backend is ready to start!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc() 