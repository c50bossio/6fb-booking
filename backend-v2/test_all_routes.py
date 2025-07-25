#!/usr/bin/env python3
"""
Comprehensive route testing script for BookedBarber V2
Tests all routes from the navigation configuration and generates a detailed report
"""

import requests
import json
import sys
from typing import Dict, List
from urllib.parse import urljoin
import time

# Base URLs
FRONTEND_URL = "http://localhost:3001"
BACKEND_URL = "http://localhost:8000"

# All routes from navigation.ts
ROUTES_TO_TEST = [
    # Main navigation items
    "/dashboard",
    "/calendar",
    "/bookings",
    "/barber/availability",
    "/recurring",
    "/clients",
    "/clients/new",
    "/notifications",
    
    # Marketing Suite
    "/marketing",
    "/marketing/campaigns",
    "/marketing/templates",
    "/marketing/contacts",
    "/marketing/analytics",
    "/marketing/billing",
    
    # Finance Hub
    "/finance",
    "/payments",
    "/barber/earnings",
    "/payments/gift-certificates",
    "/commissions",
    "/payouts",
    "/finance/analytics",
    
    # Analytics
    "/analytics",
    
    # Enterprise
    "/enterprise/dashboard",
    
    # Administration
    "/admin",
    "/admin/services",
    "/dashboard/staff/invitations",
    "/admin/booking-rules",
    "/admin/webhooks",
    
    # Business Tools
    "/tools",
    "/import",
    "/export",
    "/products",
    
    # Settings
    "/settings",
    "/settings/profile",
    "/settings/calendar",
    "/settings/notifications",
    "/settings/integrations",
    "/settings/tracking-pixels",
    "/settings/test-data",
    
    # Public routes
    "/",
    "/login",
    "/register",
    "/check-email",
    "/forgot-password",
    "/terms",
    "/privacy",
    "/cookies",
    "/agents",
    
    # Additional routes found in app directory
    "/customers",
    "/demo/registration",
    "/test-booking",
    "/dragtest",
    "/embed",
]

def test_route(route: str, base_url: str = FRONTEND_URL) -> Dict:
    """Test a single route and return detailed results"""
    url = urljoin(base_url, route)
    result = {
        "route": route,
        "url": url,
        "status_code": None,
        "success": False,
        "error": None,
        "response_time": None,
        "content_length": None,
        "content_type": None,
        "has_error_content": False,
        "error_details": None
    }
    
    try:
        start_time = time.time()
        response = requests.get(url, timeout=10, allow_redirects=True)
        response_time = time.time() - start_time
        
        result["status_code"] = response.status_code
        result["response_time"] = round(response_time, 3)
        result["content_length"] = len(response.content)
        result["content_type"] = response.headers.get('content-type', '')
        
        # Check if response is successful
        if response.status_code == 200:
            result["success"] = True
            
            # Check for error content in the response
            content = response.text.lower()
            error_indicators = [
                "404", "500", "error", "not found", "internal server error",
                "something went wrong", "application error", "exception",
                "stack trace", "traceback"
            ]
            
            if any(indicator in content for indicator in error_indicators):
                result["has_error_content"] = True
                result["error_details"] = "Page loaded but contains error content"
                
        elif response.status_code == 404:
            result["error"] = "Page not found (404)"
        elif response.status_code == 500:
            result["error"] = "Internal server error (500)"
        elif response.status_code >= 400:
            result["error"] = f"Client error ({response.status_code})"
        elif response.status_code >= 300:
            result["error"] = f"Redirect ({response.status_code})"
            
    except requests.exceptions.Timeout:
        result["error"] = "Request timeout"
    except requests.exceptions.ConnectionError:
        result["error"] = "Connection error"
    except requests.exceptions.RequestException as e:
        result["error"] = f"Request error: {str(e)}"
    except Exception as e:
        result["error"] = f"Unexpected error: {str(e)}"
        
    return result

def test_backend_health():
    """Test backend health endpoint"""
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=5)
        return {
            "status": "healthy" if response.status_code == 200 else "unhealthy",
            "status_code": response.status_code,
            "response": response.json() if response.status_code == 200 else None
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

def generate_report(results: List[Dict]) -> Dict:
    """Generate a comprehensive test report"""
    total_routes = len(results)
    successful_routes = sum(1 for r in results if r["success"] and not r["has_error_content"])
    failed_routes = sum(1 for r in results if not r["success"])
    error_content_routes = sum(1 for r in results if r["has_error_content"])
    
    # Categorize issues
    issues = {
        "404_errors": [r for r in results if r["status_code"] == 404],
        "500_errors": [r for r in results if r["status_code"] == 500],
        "other_errors": [r for r in results if r["error"] and r["status_code"] not in [404, 500]],
        "error_content": [r for r in results if r["has_error_content"]],
        "slow_routes": [r for r in results if r["response_time"] and r["response_time"] > 3.0],
    }
    
    report = {
        "summary": {
            "total_routes": total_routes,
            "successful_routes": successful_routes,
            "failed_routes": failed_routes,
            "error_content_routes": error_content_routes,
            "success_rate": round((successful_routes / total_routes) * 100, 1) if total_routes > 0 else 0
        },
        "issues": issues,
        "all_results": results
    }
    
    return report

def print_summary(report: Dict):
    """Print a human-readable summary"""
    summary = report["summary"]
    issues = report["issues"]
    
    print("\n" + "="*60)
    print("BOOKEDBARBER V2 ROUTE TESTING REPORT")
    print("="*60)
    
    print(f"\nOVERALL SUMMARY:")
    print(f"  Total routes tested: {summary['total_routes']}")
    print(f"  Successful routes: {summary['successful_routes']}")
    print(f"  Failed routes: {summary['failed_routes']}")
    print(f"  Routes with error content: {summary['error_content_routes']}")
    print(f"  Success rate: {summary['success_rate']}%")
    
    if issues["404_errors"]:
        print(f"\n404 ERRORS ({len(issues['404_errors'])} routes):")
        for result in issues["404_errors"]:
            print(f"  ❌ {result['route']} - Page not found")
    
    if issues["500_errors"]:
        print(f"\n500 ERRORS ({len(issues['500_errors'])} routes):")
        for result in issues["500_errors"]:
            print(f"  ❌ {result['route']} - Internal server error")
    
    if issues["other_errors"]:
        print(f"\nOTHER ERRORS ({len(issues['other_errors'])} routes):")
        for result in issues["other_errors"]:
            print(f"  ❌ {result['route']} - {result['error']}")
    
    if issues["error_content"]:
        print(f"\nERROR CONTENT DETECTED ({len(issues['error_content'])} routes):")
        for result in issues["error_content"]:
            print(f"  ⚠️  {result['route']} - {result['error_details']}")
    
    if issues["slow_routes"]:
        print(f"\nSLOW ROUTES ({len(issues['slow_routes'])} routes):")
        for result in issues["slow_routes"]:
            print(f"  🐌 {result['route']} - {result['response_time']}s")
    
    # Show successful routes
    successful = [r for r in report["all_results"] if r["success"] and not r["has_error_content"]]
    if successful:
        print(f"\nSUCCESSFUL ROUTES ({len(successful)} routes):")
        for result in successful:
            print(f"  ✅ {result['route']} - {result['response_time']}s")

def main():
    """Main testing function"""
    print("Starting comprehensive route testing...")
    print(f"Frontend URL: {FRONTEND_URL}")
    print(f"Backend URL: {BACKEND_URL}")
    
    # Test backend health first
    print("\nTesting backend health...")
    backend_health = test_backend_health()
    print(f"Backend status: {backend_health['status']}")
    
    # Test all routes
    print(f"\nTesting {len(ROUTES_TO_TEST)} routes...")
    results = []
    
    for i, route in enumerate(ROUTES_TO_TEST, 1):
        print(f"Testing [{i}/{len(ROUTES_TO_TEST)}] {route}...", end=" ")
        result = test_route(route)
        results.append(result)
        
        if result["success"] and not result["has_error_content"]:
            print("✅")
        elif result["has_error_content"]:
            print("⚠️")
        else:
            print("❌")
    
    # Generate and display report
    report = generate_report(results)
    print_summary(report)
    
    # Save detailed report to file
    with open("route_test_report.json", "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"\nDetailed report saved to: route_test_report.json")
    
    # Exit with error code if there are failures
    if report["summary"]["failed_routes"] > 0 or report["summary"]["error_content_routes"] > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()