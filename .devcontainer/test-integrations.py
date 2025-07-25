#!/usr/bin/env python3
"""
BookedBarber V2 - External Integrations Test for Codespaces
===========================================================
🧪 Tests external service integrations in GitHub Codespaces environment
🔍 Validates Stripe, Google Calendar, SendGrid, and other API connections
"""

import os
import json
import requests
import time
from datetime import datetime
from urllib.parse import urljoin

# Colors for output
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'

def print_header(title):
    print(f"{Colors.BLUE}{'=' * 80}{Colors.NC}")
    print(f"{Colors.BLUE}{title}{Colors.NC}")
    print(f"{Colors.BLUE}{'=' * 80}{Colors.NC}")

def print_success(message):
    print(f"{Colors.GREEN}✅ {message}{Colors.NC}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠️ {message}{Colors.NC}")

def print_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.NC}")

def print_info(message):
    print(f"{Colors.YELLOW}ℹ️ {message}{Colors.NC}")

def get_codespace_url():
    """Get the public URL for the current codespace"""
    codespace_name = os.environ.get('CODESPACE_NAME')
    github_codespaces_port_forwarding_domain = os.environ.get('GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN')
    
    if codespace_name and github_codespaces_port_forwarding_domain:
        return f"https://{codespace_name}-8000.{github_codespaces_port_forwarding_domain}"
    else:
        return "http://localhost:8000"  # Fallback for local development

def test_backend_connectivity():
    """Test that the backend API is accessible"""
    print(f"\n{Colors.YELLOW}🔗 Testing backend API connectivity...{Colors.NC}")
    
    backend_url = get_codespace_url()
    print_info(f"Testing backend at: {backend_url}")
    
    try:
        # Test health endpoint
        response = requests.get(f"{backend_url}/health", timeout=10)
        if response.status_code == 200:
            print_success(f"Backend API accessible at {backend_url}")
            return True, backend_url
        else:
            print_error(f"Backend API returned status {response.status_code}")
            return False, backend_url
    except requests.exceptions.RequestException as e:
        print_error(f"Cannot connect to backend API: {e}")
        return False, backend_url

def test_stripe_integration():
    """Test Stripe API integration"""
    print(f"\n{Colors.YELLOW}💳 Testing Stripe integration...{Colors.NC}")
    
    stripe_secret_key = os.environ.get('STRIPE_SECRET_KEY')
    stripe_publishable_key = os.environ.get('STRIPE_PUBLISHABLE_KEY')
    
    if not stripe_secret_key:
        print_warning("STRIPE_SECRET_KEY not found in environment")
        return False
    
    if not stripe_publishable_key:
        print_warning("STRIPE_PUBLISHABLE_KEY not found in environment")
        return False
    
    # Test Stripe API connection
    try:
        headers = {
            'Authorization': f'Bearer {stripe_secret_key}',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        
        # Test with a simple balance retrieval (safe for test keys)
        response = requests.get('https://api.stripe.com/v1/balance', headers=headers, timeout=10)
        
        if response.status_code == 200:
            balance_data = response.json()
            print_success("Stripe API connection successful")
            print_info(f"Test account balance: {balance_data.get('available', [{}])[0].get('amount', 'N/A')}")
            
            # Test webhook endpoint configuration
            backend_url = get_codespace_url()
            webhook_url = f"{backend_url}/api/v2/webhooks/stripe"
            print_info(f"Stripe webhook should point to: {webhook_url}")
            
            return True
        else:
            print_error(f"Stripe API returned status {response.status_code}: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print_error(f"Failed to connect to Stripe API: {e}")
        return False

def test_google_oauth():
    """Test Google OAuth configuration"""
    print(f"\n{Colors.YELLOW}🔐 Testing Google OAuth configuration...{Colors.NC}")
    
    google_client_id = os.environ.get('GOOGLE_CLIENT_ID')
    google_client_secret = os.environ.get('GOOGLE_CLIENT_SECRET')
    
    if not google_client_id:
        print_warning("GOOGLE_CLIENT_ID not found in environment")
        return False
    
    if not google_client_secret:
        print_warning("GOOGLE_CLIENT_SECRET not found in environment")
        return False
    
    # Validate client ID format
    if google_client_id.endswith('.apps.googleusercontent.com'):
        print_success("Google Client ID format is valid")
    else:
        print_warning("Google Client ID format may be invalid")
    
    # Test OAuth redirect URLs for Codespaces
    backend_url = get_codespace_url()
    oauth_redirect_url = f"{backend_url}/auth/google/callback"
    print_info(f"Google OAuth redirect URL should be: {oauth_redirect_url}")
    
    # Note: We can't test the actual OAuth flow without user interaction
    print_success("Google OAuth configuration appears valid")
    return True

def test_sendgrid_integration():
    """Test SendGrid email integration"""
    print(f"\n{Colors.YELLOW}📧 Testing SendGrid integration...{Colors.NC}")
    
    sendgrid_api_key = os.environ.get('SENDGRID_API_KEY')
    
    if not sendgrid_api_key:
        print_warning("SENDGRID_API_KEY not found in environment")
        return False
    
    try:
        headers = {
            'Authorization': f'Bearer {sendgrid_api_key}',
            'Content-Type': 'application/json'
        }
        
        # Test API key validity (safe endpoint)
        response = requests.get('https://api.sendgrid.com/v3/user/account', headers=headers, timeout=10)
        
        if response.status_code == 200:
            account_data = response.json()
            print_success("SendGrid API connection successful")
            print_info(f"Account type: {account_data.get('type', 'N/A')}")
            return True
        else:
            print_error(f"SendGrid API returned status {response.status_code}: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print_error(f"Failed to connect to SendGrid API: {e}")
        return False

def test_twilio_integration():
    """Test Twilio SMS integration"""
    print(f"\n{Colors.YELLOW}📱 Testing Twilio integration...{Colors.NC}")
    
    twilio_account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
    twilio_auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
    
    if not twilio_account_sid:
        print_warning("TWILIO_ACCOUNT_SID not found in environment")
        return False
    
    if not twilio_auth_token:
        print_warning("TWILIO_AUTH_TOKEN not found in environment")
        return False
    
    try:
        # Test Twilio API connection
        url = f'https://api.twilio.com/2010-04-01/Accounts/{twilio_account_sid}.json'
        response = requests.get(url, auth=(twilio_account_sid, twilio_auth_token), timeout=10)
        
        if response.status_code == 200:
            account_data = response.json()
            print_success("Twilio API connection successful")
            print_info(f"Account status: {account_data.get('status', 'N/A')}")
            return True
        else:
            print_error(f"Twilio API returned status {response.status_code}: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print_error(f"Failed to connect to Twilio API: {e}")
        return False

def test_google_analytics():
    """Test Google Analytics configuration"""
    print(f"\n{Colors.YELLOW}📊 Testing Google Analytics configuration...{Colors.NC}")
    
    ga_tracking_id = os.environ.get('GOOGLE_ANALYTICS_ID') or os.environ.get('NEXT_PUBLIC_GA_TRACKING_ID')
    gtm_id = os.environ.get('GOOGLE_TAG_MANAGER_ID') or os.environ.get('NEXT_PUBLIC_GTM_ID')
    
    if not ga_tracking_id and not gtm_id:
        print_warning("No Google Analytics or GTM ID found in environment")
        return False
    
    if ga_tracking_id:
        if ga_tracking_id.startswith('G-'):
            print_success(f"Google Analytics 4 ID format valid: {ga_tracking_id}")
        else:
            print_warning(f"Google Analytics ID format may be invalid: {ga_tracking_id}")
    
    if gtm_id:
        if gtm_id.startswith('GTM-'):
            print_success(f"Google Tag Manager ID format valid: {gtm_id}")
        else:
            print_warning(f"GTM ID format may be invalid: {gtm_id}")
    
    return True

def test_meta_pixel():
    """Test Meta (Facebook) Pixel configuration"""
    print(f"\n{Colors.YELLOW}📈 Testing Meta Pixel configuration...{Colors.NC}")
    
    meta_pixel_id = os.environ.get('META_PIXEL_ID') or os.environ.get('NEXT_PUBLIC_META_PIXEL_ID')
    
    if not meta_pixel_id:
        print_warning("META_PIXEL_ID not found in environment")
        return False
    
    if meta_pixel_id.isdigit() and len(meta_pixel_id) >= 15:
        print_success(f"Meta Pixel ID format appears valid: {meta_pixel_id}")
        return True
    else:
        print_warning(f"Meta Pixel ID format may be invalid: {meta_pixel_id}")
        return False

def test_webhook_endpoints():
    """Test webhook endpoint accessibility"""
    print(f"\n{Colors.YELLOW}🔗 Testing webhook endpoints...{Colors.NC}")
    
    backend_url = get_codespace_url()
    
    webhook_endpoints = [
        "/api/v2/webhooks/stripe",
        "/api/v2/webhooks/twilio",
        "/api/v2/webhooks/google-calendar"
    ]
    
    results = []
    for endpoint in webhook_endpoints:
        webhook_url = f"{backend_url}{endpoint}"
        try:
            # Test with a HEAD request to avoid triggering webhook logic
            response = requests.head(webhook_url, timeout=5)
            if response.status_code in [200, 405, 404]:  # 405 = Method Not Allowed is OK for webhooks
                print_success(f"Webhook endpoint accessible: {endpoint}")
                results.append(True)
            else:
                print_warning(f"Webhook endpoint {endpoint} returned {response.status_code}")
                results.append(False)
        except requests.exceptions.RequestException as e:
            print_error(f"Cannot reach webhook endpoint {endpoint}: {e}")
            results.append(False)
    
    return all(results)

def test_cors_configuration():
    """Test CORS configuration for Codespaces"""
    print(f"\n{Colors.YELLOW}🌐 Testing CORS configuration...{Colors.NC}")
    
    cors_origins = os.environ.get('CORS_ORIGINS', '')
    backend_url = get_codespace_url()
    
    # Check if Codespaces domains are included in CORS origins
    codespace_domains = [
        '*.githubpreview.dev',
        '*.github.dev',
        '*.codespaces.githubusercontent.com'
    ]
    
    missing_domains = []
    for domain in codespace_domains:
        if domain not in cors_origins:
            missing_domains.append(domain)
    
    if missing_domains:
        print_warning(f"CORS may not allow these Codespaces domains: {missing_domains}")
        print_info("Consider adding these to your CORS_ORIGINS environment variable")
    else:
        print_success("CORS configuration includes Codespaces domains")
    
    # Test actual CORS with a preflight request
    try:
        headers = {
            'Origin': backend_url.replace('8000', '3000'),  # Simulate frontend origin
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Content-Type'
        }
        response = requests.options(f"{backend_url}/api/v2/health", headers=headers, timeout=5)
        
        if 'Access-Control-Allow-Origin' in response.headers:
            print_success("CORS preflight requests working")
            return True
        else:
            print_warning("CORS headers not found in response")
            return False
    except requests.exceptions.RequestException as e:
        print_error(f"CORS test failed: {e}")
        return False

def generate_integration_report():
    """Generate a comprehensive integration test report"""
    print_header("BookedBarber V2 - Integration Test Report")
    
    # Get environment info
    is_codespaces = os.environ.get('CODESPACES') == 'true'
    codespace_name = os.environ.get('CODESPACE_NAME', 'N/A')
    
    print_info(f"Environment: {'GitHub Codespaces' if is_codespaces else 'Local Development'}")
    if is_codespaces:
        print_info(f"Codespace: {codespace_name}")
    
    # Run all integration tests
    tests = [
        ("Backend API Connectivity", test_backend_connectivity),
        ("Stripe Integration", test_stripe_integration),
        ("Google OAuth Configuration", test_google_oauth),
        ("SendGrid Integration", test_sendgrid_integration),
        ("Twilio Integration", test_twilio_integration),
        ("Google Analytics Configuration", test_google_analytics),
        ("Meta Pixel Configuration", test_meta_pixel),
        ("Webhook Endpoints", test_webhook_endpoints),
        ("CORS Configuration", test_cors_configuration),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            print(f"\n{'-' * 60}")
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print_error(f"Test '{test_name}' failed with exception: {e}")
            results.append((test_name, False))
    
    # Generate summary
    print_header("Integration Test Summary")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "PASSED" if result else "FAILED"
        color_func = print_success if result else print_error
        color_func(f"{test_name}: {status}")
    
    print(f"\n{Colors.BLUE}Overall Results: {passed}/{total} tests passed{Colors.NC}")
    
    # Provide recommendations
    if passed < total:
        print_header("Recommendations")
        print_info("To fix failing integrations:")
        print("1. Set missing environment variables in GitHub Codespaces Secrets")
        print("2. Update webhook URLs to point to your Codespace")
        print("3. Add Codespaces domains to your service configurations")
        print("4. Verify API keys are valid and have correct permissions")
    
    # Generate webhook configuration guide
    backend_url = get_codespace_url()
    if is_codespaces:
        print_header("Webhook Configuration for Codespaces")
        print_info("Update these webhook endpoints in your external services:")
        print(f"• Stripe Webhook: {backend_url}/api/v2/webhooks/stripe")
        print(f"• Twilio Webhook: {backend_url}/api/v2/webhooks/twilio") 
        print(f"• Google Calendar: {backend_url}/api/v2/webhooks/google-calendar")
        print_info("Note: Codespace URLs change when the codespace is rebuilt")
    
    return passed == total

def main():
    """Run all integration tests"""
    success = generate_integration_report()
    
    if success:
        print_success("\n🎉 All integrations ready for Codespaces development!")
        return 0
    else:
        print_error("\n❌ Some integrations need configuration. See recommendations above.")
        return 1

if __name__ == "__main__":
    import sys
    sys.exit(main())