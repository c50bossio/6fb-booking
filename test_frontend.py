#!/usr/bin/env python3
"""
Test frontend login flow
"""
import time
import requests

def test_frontend_health():
    """Check if frontend is running"""
    try:
        response = requests.get("http://localhost:3001")
        print(f"Frontend Status: {response.status_code}")
        return response.status_code == 200
    except Exception as e:
        print(f"Frontend Error: {e}")
        return False

def test_backend_health():
    """Check if backend is running"""
    try:
        response = requests.get("http://localhost:8000/docs")
        print(f"Backend Status: {response.status_code}")
        return response.status_code == 200
    except Exception as e:
        print(f"Backend Error: {e}")
        return False

def main():
    print("6FB Platform Health Check")
    print("=" * 50)
    
    frontend_ok = test_frontend_health()
    backend_ok = test_backend_health()
    
    print("\nSummary:")
    print(f"✓ Frontend: {'Running' if frontend_ok else 'Not Running'} (http://localhost:3001)")
    print(f"✓ Backend: {'Running' if backend_ok else 'Not Running'} (http://localhost:8000)")
    
    if frontend_ok and backend_ok:
        print("\n✅ Both services are running! You can now:")
        print("1. Open http://localhost:3001 in your browser")
        print("2. Click 'Sign In' or go to http://localhost:3001/login")
        print("3. Use credentials: admin@6fb.com / password123")
    else:
        print("\n❌ Please ensure both services are running")

if __name__ == "__main__":
    main()