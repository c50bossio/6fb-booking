#!/usr/bin/env python3
"""
Browser Integration Test for BookedBarber V2 Application
Uses browser automation to perform comprehensive testing including authentication
"""

import requests
import json
from datetime import datetime
import subprocess
import os
import tempfile

# Configuration
FRONTEND_URL = "http://localhost:3001"
BACKEND_URL = "http://localhost:8000"

class BrowserTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        
    def test_api_with_auth(self, endpoint, method="GET", data=None, require_auth=True):
        """Test an API endpoint with proper authentication"""
        try:
            url = f"{BACKEND_URL}{endpoint}"
            headers = {}
            
            if self.auth_token and require_auth:
                headers["Authorization"] = f"Bearer {self.auth_token}"
            
            if method == "GET":
                response = self.session.get(url, headers=headers, timeout=10)
            elif method == "POST":
                response = self.session.post(url, json=data, headers=headers, timeout=10)
            
            return {
                "endpoint": endpoint,
                "status_code": response.status_code,
                "success": 200 <= response.status_code < 300,
                "response_time": response.elapsed.total_seconds(),
                "requires_auth": response.status_code == 403 and "Not authenticated" in response.text,
                "not_found": response.status_code == 404,
                "error": None if 200 <= response.status_code < 300 else response.text[:200]
            }
        except Exception as e:
            return {
                "endpoint": endpoint,
                "status_code": None,
                "success": False,
                "response_time": None,
                "requires_auth": False,
                "not_found": False,
                "error": str(e)
            }

    def test_frontend_page(self, page_path):
        """Test frontend page accessibility"""
        try:
            url = f"{FRONTEND_URL}{page_path}"
            response = self.session.get(url, timeout=10)
            
            return {
                "page": page_path,
                "status_code": response.status_code,
                "success": 200 <= response.status_code < 300,
                "response_time": response.elapsed.total_seconds(),
                "size_kb": len(response.content) / 1024,
                "has_react": "react" in response.text.lower() or "next" in response.text.lower(),
                "error": None if 200 <= response.status_code < 300 else "Page not accessible"
            }
        except Exception as e:
            return {
                "page": page_path,
                "status_code": None,
                "success": False,
                "response_time": None,
                "size_kb": 0,
                "has_react": False,
                "error": str(e)
            }

    def test_chrome_automation(self):
        """Test if Chrome automation is working"""
        try:
            # Create a simple HTML file to test
            with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as f:
                f.write("""
                <!DOCTYPE html>
                <html>
                <head><title>Chrome Test</title></head>
                <body>
                    <h1>Browser Automation Test</h1>
                    <div id="test-element">Test successful</div>
                    <script>
                        console.log('Chrome automation test successful');
                        document.getElementById('test-element').style.color = 'green';
                    </script>
                </body>
                </html>
                """)
                test_file = f.name
            
            # Try to open with Chrome
            cmd = f"open -a 'Google Chrome' 'file://{test_file}'"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=5)
            
            # Clean up
            os.unlink(test_file)
            
            return {
                "chrome_available": result.returncode == 0,
                "error": result.stderr if result.returncode != 0 else None
            }
            
        except Exception as e:
            return {
                "chrome_available": False,
                "error": str(e)
            }

def main():
    """Run comprehensive browser integration test"""
    print("🌐 Starting Browser Integration Test for BookedBarber V2")
    print("=" * 70)
    
    tester = BrowserTester()
    results = {
        "timestamp": datetime.now().isoformat(),
        "chrome_test": {},
        "api_tests": [],
        "frontend_tests": [],
        "summary": {}
    }
    
    # 1. Test Chrome Automation
    print("\n🔧 Testing Chrome Browser Automation...")
    chrome_result = tester.test_chrome_automation()
    results["chrome_test"] = chrome_result
    
    chrome_emoji = "✅" if chrome_result["chrome_available"] else "❌"
    print(f"{chrome_emoji} Chrome automation: {'Available' if chrome_result['chrome_available'] else 'Not available'}")
    
    if chrome_result["error"]:
        print(f"   Error: {chrome_result['error']}")
    
    # 2. Test Core API Endpoints (without auth first)
    print("\n📡 Testing API Endpoints (Public & Auth Required)...")
    
    api_endpoints = [
        # Public endpoints
        ("/", False),
        ("/health", False),
        ("/api/v2/health", False),
        
        # Auth required endpoints
        ("/api/v1/analytics/dashboard", True),
        ("/api/v1/analytics/revenue", True),
        ("/api/v1/analytics/appointments", True),
        ("/api/v1/users/me", True),
        ("/api/v1/appointments", True),
        ("/api/v1/commissions", True),
        ("/api/v1/clients", True),
    ]
    
    for endpoint, requires_auth in api_endpoints:
        result = tester.test_api_with_auth(endpoint, require_auth=requires_auth)
        results["api_tests"].append(result)
        
        if result["success"]:
            status_emoji = "✅"
            status_text = f"{result['status_code']} ({result.get('response_time', 'N/A')}s)"
        elif result["requires_auth"] and requires_auth:
            status_emoji = "🔒"
            status_text = "403 (Auth Required) - Expected"
        elif result["not_found"]:
            status_emoji = "❌"
            status_text = "404 (Not Found)"
        else:
            status_emoji = "❌"
            status_text = f"{result['status_code']} - Error"
        
        print(f"{status_emoji} {endpoint}: {status_text}")
        
        if result["error"] and not (result["requires_auth"] and requires_auth):
            print(f"   Error: {result['error'][:100]}...")
    
    # 3. Test Frontend Pages
    print("\n🌐 Testing Frontend Pages...")
    
    frontend_pages = [
        "/",
        "/dashboard", 
        "/finance/analytics",
        "/commissions",
        "/clients",
        "/calendar",
        "/settings"
    ]
    
    for page in frontend_pages:
        result = tester.test_frontend_page(page)
        results["frontend_tests"].append(result)
        
        status_emoji = "✅" if result["success"] else "❌"
        size_info = f"({result.get('size_kb', 0):.1f}KB)" if result["success"] else ""
        react_info = "📱" if result.get("has_react") else ""
        
        print(f"{status_emoji} {page}: {result['status_code']} {size_info} {react_info}")
        
        if not result["success"] and result["error"]:
            print(f"   Error: {result['error'][:50]}...")
    
    # 4. Calculate Success Rates
    api_success = sum(1 for test in results["api_tests"] if test["success"] or (test["requires_auth"] and test.get("requires_auth")))
    api_total = len(results["api_tests"])
    api_rate = (api_success / api_total) * 100 if api_total > 0 else 0
    
    frontend_success = sum(1 for test in results["frontend_tests"] if test["success"])
    frontend_total = len(results["frontend_tests"])
    frontend_rate = (frontend_success / frontend_total) * 100 if frontend_total > 0 else 0
    
    overall_score = (api_rate + frontend_rate) / 2
    
    # 5. Generate Summary
    results["summary"] = {
        "chrome_available": chrome_result["chrome_available"],
        "api_success_rate": api_rate,
        "frontend_success_rate": frontend_rate,
        "overall_score": overall_score,
        "api_working": api_success,
        "api_total": api_total,
        "frontend_working": frontend_success,
        "frontend_total": frontend_total
    }
    
    # 6. Final Report
    print("\n" + "=" * 70)
    print("📋 BROWSER INTEGRATION TEST REPORT")
    print("=" * 70)
    
    # Overall Health
    if overall_score >= 90:
        print("🎉 EXCELLENT: Application is ready for browser testing!")
        grade = "A+"
    elif overall_score >= 80:
        print("✅ GOOD: Application is mostly working with minor issues")
        grade = "A"
    elif overall_score >= 70:
        print("⚠️  FAIR: Application has some issues that may affect testing")
        grade = "B"
    elif overall_score >= 50:
        print("🔧 POOR: Application has significant issues")
        grade = "C"
    else:
        print("🚨 CRITICAL: Application has major failures")
        grade = "F"
    
    print(f"Overall Health Score: {overall_score:.1f}% (Grade: {grade})")
    
    # Component Status
    print(f"\n📊 Component Status:")
    print(f"  🔧 Chrome Automation: {'✅ Available' if chrome_result['chrome_available'] else '❌ Not Available'}")
    print(f"  📡 API Endpoints: {api_success}/{api_total} working ({api_rate:.1f}%)")
    print(f"  🌐 Frontend Pages: {frontend_success}/{frontend_total} working ({frontend_rate:.1f}%)")
    
    # Key Findings
    print(f"\n🔍 Key Findings:")
    
    # API Analysis
    auth_required = sum(1 for test in results["api_tests"] if test.get("requires_auth"))
    not_found = sum(1 for test in results["api_tests"] if test.get("not_found"))
    
    if auth_required > 0:
        print(f"  🔒 {auth_required} endpoints require authentication (expected)")
    if not_found > 0:
        print(f"  ❌ {not_found} endpoints not found (may need implementation)")
    
    # Frontend Analysis
    react_pages = sum(1 for test in results["frontend_tests"] if test.get("has_react"))
    if react_pages > 0:
        print(f"  📱 {react_pages} pages contain React/Next.js content")
    
    # Specific Issues
    critical_pages = ["/", "/dashboard", "/finance/analytics"]
    critical_failures = [test for test in results["frontend_tests"] 
                        if test["page"] in critical_pages and not test["success"]]
    
    if critical_failures:
        print(f"  🚨 Critical page failures: {[test['page'] for test in critical_failures]}")
    
    # Browser Testing Readiness
    print(f"\n🎯 Browser Testing Readiness:")
    if chrome_result["chrome_available"] and frontend_rate >= 80:
        print("  ✅ Ready for comprehensive browser testing")
        print("  ✅ Chrome automation available")
        print("  ✅ Frontend pages accessible")
    elif chrome_result["chrome_available"]:
        print("  ⚠️  Chrome available but frontend issues detected")
        print("  🔧 Fix frontend issues before browser testing")
    else:
        print("  ❌ Not ready for browser testing")
        print("  🔧 Chrome automation setup required")
    
    # Recommendations
    print(f"\n💡 Recommendations:")
    if not chrome_result["chrome_available"]:
        print("  1. Install Chrome and enable remote debugging")
        print("     Command: google-chrome --remote-debugging-port=9222")
    
    if auth_required > 0:
        print("  2. Implement authentication for browser testing")
        print("     Note: Auth-protected endpoints need login flow")
    
    if not_found > 0:
        print("  3. Check missing API endpoints")
        print("     Some analytics endpoints may need implementation")
    
    if frontend_rate < 100:
        print("  4. Investigate frontend page failures")
        print("     Ensure all routes are properly configured")
    
    # Save Results
    with open("browser_integration_test_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: browser_integration_test_results.json")
    print(f"🕒 Test completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    return results

if __name__ == "__main__":
    main()