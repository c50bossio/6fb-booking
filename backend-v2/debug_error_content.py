#!/usr/bin/env python3
"""
Debug what content is being flagged as error content
"""

import requests

def check_route_content(route, base_url="http://localhost:3001"):
    """Check what error content is found in a route"""
    url = f"{base_url}{route}"
    
    try:
        response = requests.get(url, timeout=10)
        content = response.text.lower()
        
        error_indicators = [
            "404", "500", "error", "not found", "internal server error",
            "something went wrong", "application error", "exception",
            "stack trace", "traceback"
        ]
        
        found_indicators = []
        for indicator in error_indicators:
            if indicator in content:
                # Find context around the indicator
                index = content.find(indicator)
                start = max(0, index - 50)
                end = min(len(content), index + len(indicator) + 50)
                context = content[start:end].replace('\n', ' ').replace('\r', ' ')
                found_indicators.append(f"'{indicator}' found in: {context}")
        
        return {
            "route": route,
            "status": response.status_code,
            "length": len(response.content),
            "found_indicators": found_indicators
        }
        
    except Exception as e:
        return {
            "route": route,
            "status": "ERROR",
            "error": str(e),
            "found_indicators": []
        }

def main():
    # Test a few routes that are flagged as having error content
    test_routes = ["/dashboard", "/finance", "/settings"]
    
    for route in test_routes:
        result = check_route_content(route)
        print(f"\n=== {route} ===")
        print(f"Status: {result['status']}")
        print(f"Content length: {result['length']}")
        print(f"Found indicators: {len(result['found_indicators'])}")
        
        for indicator in result['found_indicators']:
            print(f"  {indicator}")

if __name__ == "__main__":
    main()