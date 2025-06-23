#!/usr/bin/env python3
"""
Diagnose services import issue
"""

import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=== Diagnosing Services Import ===\n")

# Test 1: Can we import the services module?
try:
    from api.v1 import services
    print("✓ Successfully imported api.v1.services")
    print(f"  Module location: {services.__file__}")
except Exception as e:
    print(f"✗ Failed to import api.v1.services: {e}")
    sys.exit(1)

# Test 2: Does the module have a router?
try:
    router = services.router
    print("✓ Services module has a router attribute")
    print(f"  Router type: {type(router)}")
except AttributeError as e:
    print(f"✗ Services module missing router attribute: {e}")
    sys.exit(1)

# Test 3: What routes are defined?
try:
    from fastapi import APIRouter
    if isinstance(router, APIRouter):
        print("✓ Router is a FastAPI APIRouter")
        # Get routes
        routes = []
        for route in router.routes:
            if hasattr(route, 'path') and hasattr(route, 'methods'):
                routes.append(f"  {list(route.methods)} {route.path}")
        
        print(f"\nDefined routes ({len(routes)}):")
        for route in sorted(routes):
            print(route)
    else:
        print(f"✗ Router is not a FastAPI APIRouter: {type(router)}")
except Exception as e:
    print(f"✗ Error inspecting routes: {e}")

# Test 4: Check if main.py includes the router
try:
    with open('main.py', 'r') as f:
        main_content = f.read()
    
    if 'services.router' in main_content:
        print("\n✓ main.py includes services.router")
        
        # Find the exact line
        for i, line in enumerate(main_content.split('\n')):
            if 'services.router' in line:
                print(f"  Line {i+1}: {line.strip()}")
    else:
        print("\n✗ main.py does not include services.router")
except Exception as e:
    print(f"\n✗ Error checking main.py: {e}")

# Test 5: Check for import errors in services.py
print("\n=== Checking for potential import issues ===")
try:
    # Re-import with verbose error handling
    import importlib
    import api.v1.services
    
    # Check dependencies
    print("\nChecking service module dependencies:")
    
    # Check if models exist
    try:
        from models.booking import Service, ServiceCategory
        print("✓ Can import Service and ServiceCategory models")
    except Exception as e:
        print(f"✗ Cannot import booking models: {e}")
    
    # Check if database connection works
    try:
        from config.database import get_db
        print("✓ Can import database connection")
    except Exception as e:
        print(f"✗ Cannot import database: {e}")
    
    # Check if auth module works
    try:
        from api.v1.auth import get_current_user
        print("✓ Can import auth dependencies")
    except Exception as e:
        print(f"✗ Cannot import auth: {e}")
        
except Exception as e:
    print(f"✗ Error during dependency check: {e}")
    import traceback
    traceback.print_exc()

print("\n=== Diagnosis Complete ===")