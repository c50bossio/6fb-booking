#!/usr/bin/env python3
"""
Quick server status check script
"""

import requests
import sys


def check_server():
    """Check if the backend server is running and healthy"""
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend server is running and healthy!")
            return True
        else:
            print(f"❌ Backend server responded with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server!")
        print("💡 Please start the backend server:")
        print("   cd backend && uvicorn main:app --reload")
        return False
    except Exception as e:
        print(f"❌ Error checking server: {e}")
        return False


if __name__ == "__main__":
    if check_server():
        sys.exit(0)
    else:
        sys.exit(1)
