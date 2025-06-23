#!/usr/bin/env python3
"""
Health Check Script for 6FB Booking Platform
Tests all major endpoints and system components
Usage: python health-check.py --url http://your-production-url.com
"""

import os
import sys
import argparse
import requests
import json
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin
import time

# Add colors for output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_status(status, message):
    """Print colored status message"""
    if status == "success":
        print(f"{Colors.GREEN}✅ {message}{Colors.ENDC}")
    elif status == "warning":
        print(f"{Colors.YELLOW}⚠️  {message}{Colors.ENDC}")
    elif status == "error":
        print(f"{Colors.RED}❌ {message}{Colors.ENDC}")
    elif status == "info":
        print(f"{Colors.BLUE}ℹ️  {message}{Colors.ENDC}")

class HealthChecker:
    def __init__(self, base_url, auth_token=None):
        self.base_url = base_url.rstrip('/')
        self.auth_token = auth_token
        self.headers = {}
        if auth_token:
            self.headers['Authorization'] = f'Bearer {auth_token}'
        self.results = {
            "timestamp": datetime.utcnow().isoformat(),
            "base_url": self.base_url,
            "checks": [],
            "summary": {
                "total": 0,
                "passed": 0,
                "failed": 0,
                "warnings": 0
            }
        }
    
    def check_endpoint(self, endpoint, method="GET", expected_status=200, data=None, name=None):
        """Check a single endpoint"""
        url = urljoin(self.base_url, endpoint)
        check_name = name or f"{method} {endpoint}"
        
        check_result = {
            "name": check_name,
            "endpoint": endpoint,
            "method": method,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        try:
            start_time = time.time()
            
            if method == "GET":
                response = requests.get(url, headers=self.headers, timeout=10)
            elif method == "POST":
                response = requests.post(url, json=data, headers=self.headers, timeout=10)
            elif method == "PUT":
                response = requests.put(url, json=data, headers=self.headers, timeout=10)
            elif method == "DELETE":
                response = requests.delete(url, headers=self.headers, timeout=10)
            
            response_time = (time.time() - start_time) * 1000  # Convert to ms
            
            check_result.update({
                "status_code": response.status_code,
                "response_time_ms": round(response_time, 2),
                "success": response.status_code == expected_status
            })
            
            # Try to parse JSON response
            try:
                check_result["response_data"] = response.json()
            except:
                check_result["response_text"] = response.text[:200]  # First 200 chars
            
            if response.status_code == expected_status:
                print_status("success", f"{check_name} - {response.status_code} ({response_time:.0f}ms)")
                self.results["summary"]["passed"] += 1
            else:
                print_status("error", f"{check_name} - {response.status_code} (expected {expected_status})")
                self.results["summary"]["failed"] += 1
                
        except requests.exceptions.Timeout:
            check_result.update({
                "error": "Timeout",
                "success": False
            })
            print_status("error", f"{check_name} - Timeout")
            self.results["summary"]["failed"] += 1
            
        except requests.exceptions.ConnectionError:
            check_result.update({
                "error": "Connection Error",
                "success": False
            })
            print_status("error", f"{check_name} - Connection Error")
            self.results["summary"]["failed"] += 1
            
        except Exception as e:
            check_result.update({
                "error": str(e),
                "success": False
            })
            print_status("error", f"{check_name} - {str(e)}")
            self.results["summary"]["failed"] += 1
        
        self.results["checks"].append(check_result)
        self.results["summary"]["total"] += 1
        return check_result
    
    def run_health_checks(self):
        """Run all health checks"""
        print(f"\n{Colors.BOLD}🏥 6FB Booking Platform Health Check{Colors.ENDC}")
        print(f"{Colors.BOLD}Target: {self.base_url}{Colors.ENDC}")
        print("=" * 60)
        
        # 1. Basic Health Check
        print(f"\n{Colors.BOLD}1. Basic Health Checks{Colors.ENDC}")
        self.check_endpoint("/health", name="Basic Health")
        self.check_endpoint("/api/v1/health", name="API Health")
        
        # 2. Public Endpoints
        print(f"\n{Colors.BOLD}2. Public Endpoints{Colors.ENDC}")
        self.check_endpoint("/api/v1/services", name="List Services")
        self.check_endpoint("/api/v1/locations", name="List Locations")
        self.check_endpoint("/api/v1/barbers", name="List Barbers")
        
        # 3. Authentication Endpoints
        print(f"\n{Colors.BOLD}3. Authentication{Colors.ENDC}")
        # Test login with invalid credentials (should return 401)
        self.check_endpoint(
            "/api/v1/auth/login",
            method="POST",
            data={"email": "test@example.com", "password": "wrongpassword"},
            expected_status=401,
            name="Login (Invalid Credentials)"
        )
        
        # 4. Protected Endpoints (if auth token provided)
        if self.auth_token:
            print(f"\n{Colors.BOLD}4. Protected Endpoints{Colors.ENDC}")
            self.check_endpoint("/api/v1/appointments", name="List Appointments")
            self.check_endpoint("/api/v1/clients", name="List Clients")
            self.check_endpoint("/api/v1/analytics/dashboard", name="Analytics Dashboard")
        else:
            print_status("warning", "\nSkipping protected endpoint checks (no auth token provided)")
        
        # 5. Database Connectivity
        print(f"\n{Colors.BOLD}5. Database Connectivity{Colors.ENDC}")
        # Services endpoint will fail if DB is not connected
        services_check = next((c for c in self.results["checks"] if c["name"] == "List Services"), None)
        if services_check and services_check.get("success"):
            print_status("success", "Database connection verified")
        else:
            print_status("error", "Database connection issues detected")
        
        # 6. Performance Checks
        print(f"\n{Colors.BOLD}6. Performance Checks{Colors.ENDC}")
        slow_endpoints = [c for c in self.results["checks"] 
                         if c.get("response_time_ms", 0) > 1000 and c.get("success")]
        
        if slow_endpoints:
            for endpoint in slow_endpoints:
                print_status("warning", f"{endpoint['name']} is slow ({endpoint['response_time_ms']}ms)")
        else:
            avg_response_time = sum(c.get("response_time_ms", 0) for c in self.results["checks"] if c.get("success")) / max(1, self.results["summary"]["passed"])
            print_status("success", f"Average response time: {avg_response_time:.0f}ms")
        
        # 7. Error Rate Check
        print(f"\n{Colors.BOLD}7. Error Rate Analysis{Colors.ENDC}")
        error_rate = (self.results["summary"]["failed"] / max(1, self.results["summary"]["total"])) * 100
        
        if error_rate == 0:
            print_status("success", "No errors detected")
        elif error_rate < 10:
            print_status("warning", f"Error rate: {error_rate:.1f}%")
        else:
            print_status("error", f"High error rate: {error_rate:.1f}%")
        
        # Print Summary
        print(f"\n{Colors.BOLD}📊 Summary{Colors.ENDC}")
        print("=" * 60)
        print(f"Total Checks: {self.results['summary']['total']}")
        print(f"{Colors.GREEN}Passed: {self.results['summary']['passed']}{Colors.ENDC}")
        print(f"{Colors.RED}Failed: {self.results['summary']['failed']}{Colors.ENDC}")
        
        # Overall Status
        if self.results["summary"]["failed"] == 0:
            print(f"\n{Colors.GREEN}{Colors.BOLD}✅ All health checks passed!{Colors.ENDC}")
            return True
        else:
            print(f"\n{Colors.RED}{Colors.BOLD}❌ Some health checks failed!{Colors.ENDC}")
            return False
    
    def save_results(self, filename="health-check-results.json"):
        """Save results to JSON file"""
        with open(filename, 'w') as f:
            json.dump(self.results, f, indent=2)
        print_status("info", f"Results saved to {filename}")

def get_auth_token(base_url, email, password):
    """Get authentication token"""
    try:
        response = requests.post(
            urljoin(base_url, "/api/v1/auth/login"),
            json={"email": email, "password": password}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
    except:
        pass
    return None

def main():
    parser = argparse.ArgumentParser(description="Health check for 6FB Booking Platform")
    parser.add_argument("--url", default="http://localhost:8000", help="Base URL of the application")
    parser.add_argument("--email", help="Admin email for authenticated checks")
    parser.add_argument("--password", help="Admin password for authenticated checks")
    parser.add_argument("--token", help="Auth token for authenticated checks")
    parser.add_argument("--save", action="store_true", help="Save results to JSON file")
    parser.add_argument("--output", default="health-check-results.json", help="Output filename for results")
    
    args = parser.parse_args()
    
    # Get auth token if credentials provided
    auth_token = args.token
    if args.email and args.password and not auth_token:
        print_status("info", "Attempting to authenticate...")
        auth_token = get_auth_token(args.url, args.email, args.password)
        if auth_token:
            print_status("success", "Authentication successful")
        else:
            print_status("warning", "Authentication failed - continuing with public endpoints only")
    
    # Run health checks
    checker = HealthChecker(args.url, auth_token)
    success = checker.run_health_checks()
    
    # Save results if requested
    if args.save:
        checker.save_results(args.output)
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()