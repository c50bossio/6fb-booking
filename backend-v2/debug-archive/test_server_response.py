#!/usr/bin/env python3
"""
Test script to verify the optimized server responds without hanging
"""

import os
import requests
import time
import subprocess
import signal
import sys
from threading import Timer

def test_server_response():
    """Test if server starts and responds to basic requests"""
    print("🧪 Testing optimized server response...")
    
    # Set development environment
    os.environ["ENVIRONMENT"] = "development" 
    os.environ["ENABLE_DEVELOPMENT_MODE"] = "true"
    
    # Start server in background
    print("🚀 Starting server...")
    server_process = subprocess.Popen([
        "python", "-m", "uvicorn", "main:app", 
        "--host", "127.0.0.1", 
        "--port", "8000",
        "--log-level", "info"
    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    # Give server time to start
    time.sleep(5)
    
    try:
        # Test basic endpoint
        print("📡 Testing health endpoint...")
        response = requests.get("http://127.0.0.1:8000/health", timeout=10)
        
        if response.status_code == 200:
            print("✅ Health endpoint responded successfully")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.json()}")
            
            # Test root endpoint
            print("📡 Testing root endpoint...")
            root_response = requests.get("http://127.0.0.1:8000/", timeout=10)
            
            if root_response.status_code == 200:
                print("✅ Root endpoint responded successfully")
                print(f"   Response: {root_response.json()}")
                print("")
                print("🎉 SUCCESS: Server optimization prevented hanging!")
                print("   - Lightweight middleware is working")
                print("   - Server responds to requests quickly")
                print("   - No deadlock or blocking issues detected")
                return True
            else:
                print(f"❌ Root endpoint failed: {root_response.status_code}")
                return False
        else:
            print(f"❌ Health endpoint failed: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server (may not have started)")
        return False
    except requests.exceptions.Timeout:
        print("❌ Server response timed out (still hanging)")
        return False
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        return False
    finally:
        # Clean up: stop server
        if server_process.poll() is None:
            print("🛑 Stopping server...")
            server_process.terminate()
            time.sleep(2)
            if server_process.poll() is None:
                server_process.kill()

if __name__ == "__main__":
    success = test_server_response()
    sys.exit(0 if success else 1)