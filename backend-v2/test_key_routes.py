#!/usr/bin/env python3
"""
Test key routes that were previously failing
"""

import requests
import time

# Key routes that were having 500 errors
KEY_ROUTES = [
    "/finance",
    "/payments",
    "/barber/earnings", 
    "/analytics",
    "/admin",
    "/settings",
    "/",
    "/login"
]

def test_route(route, base_url="http://localhost:3001"):
    """Test a single route"""
    url = f"{base_url}{route}"
    try:
        start_time = time.time()
        response = requests.get(url, timeout=10, allow_redirects=True)
        response_time = time.time() - start_time
        
        # Check for specific error content
        content = response.text.lower()
        has_route_conflict = "cannot have two parallel pages" in content
        has_build_error = "error" in content and "stack" in content
        
        return {
            "route": route,
            "status": response.status_code,
            "time": round(response_time, 3),
            "success": response.status_code == 200,
            "route_conflict": has_route_conflict,
            "build_error": has_build_error,
            "length": len(response.content)
        }
    except Exception as e:
        return {
            "route": route,
            "status": "ERROR",
            "time": 0,
            "success": False,
            "route_conflict": False,
            "build_error": False,
            "error": str(e),
            "length": 0
        }

def main():
    print("TESTING KEY ROUTES")
    print("=" * 40)
    
    for route in KEY_ROUTES:
        result = test_route(route)
        status_emoji = "✅" if result["success"] else "❌"
        
        print(f"{status_emoji} {route} - {result['status']} - {result['time']}s")
        
        if result.get("route_conflict"):
            print(f"   ⚠️  Route conflict detected")
        if result.get("build_error"):
            print(f"   ⚠️  Build error detected")
        if result.get("error"):
            print(f"   ❌ Error: {result['error']}")
    
    print("\nTesting complete!")

if __name__ == "__main__":
    main()