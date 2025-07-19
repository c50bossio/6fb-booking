#!/usr/bin/env python3
"""
Comprehensive Final Test for BookedBarber V2 Application
Tests all key pages and functionality after recent fixes
"""

import requests
import time
import json
from datetime import datetime

# Configuration
FRONTEND_URL = "http://localhost:3001"
BACKEND_URL = "http://localhost:8000"

def test_api_endpoint(endpoint, method="GET", data=None):
    """Test an API endpoint and return response info"""
    try:
        url = f"{BACKEND_URL}{endpoint}"
        
        if method == "GET":
            response = requests.get(url, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=10)
        
        return {
            "endpoint": endpoint,
            "status_code": response.status_code,
            "success": 200 <= response.status_code < 300,
            "response_time": response.elapsed.total_seconds(),
            "error": None if 200 <= response.status_code < 300 else response.text[:200]
        }
    except Exception as e:
        return {
            "endpoint": endpoint,
            "status_code": None,
            "success": False,
            "response_time": None,
            "error": str(e)
        }

def main():
    """Run comprehensive test suite"""
    print("🚀 Starting Comprehensive Final Test for BookedBarber V2")
    print("=" * 60)
    
    # Test results storage
    results = {
        "timestamp": datetime.now().isoformat(),
        "api_tests": [],
        "frontend_tests": [],
        "overall_health": {}
    }
    
    # 1. Test Key API Endpoints
    print("\n📡 Testing API Endpoints...")
    
    api_endpoints = [
        # Core endpoints
        "/",
        "/api/v2/health",
        
        # Authentication endpoints  
        "/api/v2/auth/check",
        
        # Analytics endpoints (recently fixed)
        "/api/v2/analytics/dashboard-stats",
        "/api/v2/analytics/revenue",
        "/api/v2/analytics/bookings",
        "/api/v2/analytics/client-stats",
        
        # Financial analytics (new page)
        "/api/v2/analytics/financial",
        "/api/v2/analytics/commission-summary",
        
        # User management
        "/api/v2/users/me",
        
        # Appointment management
        "/api/v2/appointments",
        
        # Commission management
        "/api/v2/commissions",
        
        # Client management
        "/api/v2/clients"
    ]
    
    for endpoint in api_endpoints:
        result = test_api_endpoint(endpoint)
        results["api_tests"].append(result)
        
        status_emoji = "✅" if result["success"] else "❌"
        print(f"{status_emoji} {endpoint}: {result['status_code']} ({result.get('response_time', 'N/A')}s)")
        
        if not result["success"] and result["error"]:
            print(f"   Error: {result['error'][:100]}...")
    
    # 2. Calculate API Success Rate
    successful_apis = sum(1 for test in results["api_tests"] if test["success"])
    total_apis = len(results["api_tests"])
    api_success_rate = (successful_apis / total_apis) * 100 if total_apis > 0 else 0
    
    print(f"\n📊 API Test Summary: {successful_apis}/{total_apis} ({api_success_rate:.1f}%) successful")
    
    # 3. Test Frontend Pages (simulate browser access)
    print("\n🌐 Testing Frontend Pages...")
    
    frontend_pages = [
        "/",
        "/dashboard", 
        "/finance/analytics",  # New financial analytics page
        "/commissions",        # Improved commissions page
        "/clients",           # Clients page
        "/calendar",          # Calendar functionality
        "/settings"           # Settings page
    ]
    
    for page in frontend_pages:
        try:
            # Test if the page URL is accessible (frontend routing)
            url = f"{FRONTEND_URL}{page}"
            response = requests.get(url, timeout=10)
            
            page_result = {
                "page": page,
                "status_code": response.status_code,
                "success": 200 <= response.status_code < 300,
                "response_time": response.elapsed.total_seconds(),
                "error": None if 200 <= response.status_code < 300 else "Page not accessible"
            }
            
            results["frontend_tests"].append(page_result)
            
            status_emoji = "✅" if page_result["success"] else "❌"
            print(f"{status_emoji} {page}: {page_result['status_code']} ({page_result.get('response_time', 'N/A')}s)")
            
        except Exception as e:
            page_result = {
                "page": page,
                "status_code": None,
                "success": False,
                "response_time": None,
                "error": str(e)
            }
            results["frontend_tests"].append(page_result)
            print(f"❌ {page}: Error - {str(e)[:50]}...")
    
    # 4. Calculate Frontend Success Rate
    successful_pages = sum(1 for test in results["frontend_tests"] if test["success"])
    total_pages = len(results["frontend_tests"])
    frontend_success_rate = (successful_pages / total_pages) * 100 if total_pages > 0 else 0
    
    print(f"\n📊 Frontend Test Summary: {successful_pages}/{total_pages} ({frontend_success_rate:.1f}%) successful")
    
    # 5. Overall Health Assessment
    results["overall_health"] = {
        "api_success_rate": api_success_rate,
        "frontend_success_rate": frontend_success_rate,
        "overall_score": (api_success_rate + frontend_success_rate) / 2,
        "critical_issues": [],
        "recommendations": []
    }
    
    # Identify critical issues
    failed_apis = [test for test in results["api_tests"] if not test["success"]]
    failed_pages = [test for test in results["frontend_tests"] if not test["success"]]
    
    if failed_apis:
        results["overall_health"]["critical_issues"].append(f"Failed API endpoints: {len(failed_apis)}")
    
    if failed_pages:
        results["overall_health"]["critical_issues"].append(f"Failed frontend pages: {len(failed_pages)}")
    
    # 6. Generate Final Report
    print("\n" + "=" * 60)
    print("📋 FINAL COMPREHENSIVE TEST REPORT")
    print("=" * 60)
    
    overall_score = results["overall_health"]["overall_score"]
    
    if overall_score >= 90:
        print("🎉 EXCELLENT: Application is in excellent health!")
        grade = "A+"
    elif overall_score >= 80:
        print("✅ GOOD: Application is performing well with minor issues")
        grade = "A"
    elif overall_score >= 70:
        print("⚠️  FAIR: Application has some issues that need attention")
        grade = "B"
    elif overall_score >= 50:
        print("🔧 POOR: Application has significant issues")
        grade = "C"
    else:
        print("🚨 CRITICAL: Application has major failures")
        grade = "F"
    
    print(f"Overall Health Score: {overall_score:.1f}% (Grade: {grade})")
    
    print(f"\nAPI Endpoints: {successful_apis}/{total_apis} working ({api_success_rate:.1f}%)")
    print(f"Frontend Pages: {successful_pages}/{total_pages} working ({frontend_success_rate:.1f}%)")
    
    if results["overall_health"]["critical_issues"]:
        print("\n🚨 Critical Issues Found:")
        for issue in results["overall_health"]["critical_issues"]:
            print(f"  - {issue}")
    
    # 7. Specific Test Results for Key Features
    print("\n🔍 KEY FEATURE ANALYSIS:")
    
    # Analytics functionality
    analytics_tests = [test for test in results["api_tests"] if "analytics" in test["endpoint"]]
    analytics_success = sum(1 for test in analytics_tests if test["success"])
    print(f"  📊 Analytics System: {analytics_success}/{len(analytics_tests)} endpoints working")
    
    # Financial analytics (new feature)
    financial_tests = [test for test in results["api_tests"] if "financial" in test["endpoint"] or "commission" in test["endpoint"]]
    financial_success = sum(1 for test in financial_tests if test["success"])
    print(f"  💰 Financial Analytics: {financial_success}/{len(financial_tests)} endpoints working")
    
    # Core booking functionality
    booking_tests = [test for test in results["api_tests"] if any(x in test["endpoint"] for x in ["appointments", "clients", "bookings"])]
    booking_success = sum(1 for test in booking_tests if test["success"])
    print(f"  📅 Booking System: {booking_success}/{len(booking_tests)} endpoints working")
    
    # Frontend pages
    critical_pages = ["/", "/dashboard", "/finance/analytics", "/commissions"]
    critical_page_tests = [test for test in results["frontend_tests"] if test["page"] in critical_pages]
    critical_page_success = sum(1 for test in critical_page_tests if test["success"])
    print(f"  🌐 Critical Pages: {critical_page_success}/{len(critical_page_tests)} pages accessible")
    
    # 8. Save detailed results
    with open("comprehensive_test_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: comprehensive_test_results.json")
    print(f"🕒 Test completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    return results

if __name__ == "__main__":
    main()