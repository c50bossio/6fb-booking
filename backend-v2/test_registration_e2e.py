#!/usr/bin/env python3
"""
End-to-End Registration Flow Test
Tests the complete registration process including:
1. Page load verification
2. Form filling with test data
3. Accessibility checks
4. API call monitoring
5. Success flow verification
"""

import json
import requests
import time
import websocket
from datetime import datetime
from typing import Dict, List, Optional, Any
import threading
import queue

class BrowserAutomation:
    def __init__(self):
        self.tab_id = None
        self.ws = None
        self.console_logs = []
        self.network_requests = []
        self.errors = []
        self.message_queue = queue.Queue()
        
    def connect_to_browser(self) -> bool:
        """Connect to Chrome debugging instance"""
        try:
            response = requests.get('http://localhost:9222/json', timeout=5)
            tabs = response.json()
            
            # Find the register tab
            register_tab = None
            for tab in tabs:
                if 'register' in tab.get('url', '') and tab.get('type') == 'page':
                    register_tab = tab
                    break
            
            if not register_tab:
                print("❌ No register tab found")
                return False
                
            self.tab_id = register_tab['id']
            ws_url = register_tab['webSocketDebuggerUrl']
            
            print(f"✅ Connected to register tab: {register_tab['title']}")
            print(f"📍 URL: {register_tab['url']}")
            
            # Connect to WebSocket
            self.ws = websocket.WebSocket()
            self.ws.connect(ws_url)
            
            # Enable domains
            self.send_command("Runtime.enable")
            self.send_command("Console.enable")
            self.send_command("Network.enable")
            self.send_command("DOM.enable")
            
            # Start listening for events
            self.start_event_listener()
            
            return True
            
        except Exception as e:
            print(f"❌ Error connecting to browser: {e}")
            return False
    
    def send_command(self, method: str, params: Dict = None) -> Dict:
        """Send command to Chrome DevTools"""
        if not self.ws:
            return {}
            
        command = {
            "id": int(time.time() * 1000),
            "method": method,
            "params": params or {}
        }
        
        try:
            self.ws.send(json.dumps(command))
            response = self.ws.recv()
            return json.loads(response)
        except Exception as e:
            print(f"❌ Error sending command {method}: {e}")
            return {}
    
    def start_event_listener(self):
        """Start background thread to listen for browser events"""
        def listen():
            while True:
                try:
                    if self.ws:
                        message = self.ws.recv()
                        data = json.loads(message)
                        self.handle_event(data)
                except Exception as e:
                    print(f"Event listener error: {e}")
                    break
        
        listener_thread = threading.Thread(target=listen, daemon=True)
        listener_thread.start()
    
    def handle_event(self, event: Dict):
        """Handle browser events"""
        method = event.get('method', '')
        params = event.get('params', {})
        
        if method == 'Runtime.consoleAPICalled':
            log_entry = {
                'level': params.get('type', 'log'),
                'message': ' '.join([arg.get('value', str(arg)) for arg in params.get('args', [])]),
                'timestamp': datetime.now().isoformat()
            }
            self.console_logs.append(log_entry)
            
            if params.get('type') == 'error':
                self.errors.append(log_entry)
        
        elif method == 'Network.responseReceived':
            response = params.get('response', {})
            request_info = {
                'url': response.get('url', ''),
                'status': response.get('status', 0),
                'method': response.get('method', ''),
                'timestamp': datetime.now().isoformat()
            }
            self.network_requests.append(request_info)
    
    def evaluate_javascript(self, script: str) -> Any:
        """Execute JavaScript and return result"""
        result = self.send_command("Runtime.evaluate", {
            "expression": script,
            "returnByValue": True
        })
        
        if 'result' in result and 'value' in result['result']:
            return result['result']['value']
        return None
    
    def wait_for_element(self, selector: str, timeout: int = 10) -> bool:
        """Wait for element to be present"""
        start_time = time.time()
        while time.time() - start_time < timeout:
            result = self.evaluate_javascript(f"document.querySelector('{selector}') !== null")
            if result:
                return True
            time.sleep(0.5)
        return False
    
    def fill_form_field(self, selector: str, value: str) -> bool:
        """Fill a form field"""
        script = f"""
        const element = document.querySelector('{selector}');
        if (element) {{
            element.value = '{value}';
            element.dispatchEvent(new Event('input', {{ bubbles: true }}));
            element.dispatchEvent(new Event('change', {{ bubbles: true }}));
            true;
        }} else {{
            false;
        }}
        """
        return self.evaluate_javascript(script)
    
    def click_element(self, selector: str) -> bool:
        """Click an element"""
        script = f"""
        const element = document.querySelector('{selector}');
        if (element) {{
            element.click();
            true;
        }} else {{
            false;
        }}
        """
        return self.evaluate_javascript(script)
    
    def check_accessibility(self) -> Dict:
        """Check accessibility features"""
        script = """
        const results = {};
        
        // Check for required attributes
        const nameField = document.querySelector('input[name="name"]');
        const emailField = document.querySelector('input[name="email"]');
        const passwordField = document.querySelector('input[name="password"]');
        
        results.aria_required = {
            name: nameField ? nameField.getAttribute('aria-required') === 'true' : false,
            email: emailField ? emailField.getAttribute('aria-required') === 'true' : false,
            password: passwordField ? passwordField.getAttribute('aria-required') === 'true' : false
        };
        
        // Check for aria-describedby
        results.aria_describedby = {
            name: nameField ? nameField.hasAttribute('aria-describedby') : false,
            email: emailField ? emailField.hasAttribute('aria-describedby') : false,
            password: passwordField ? passwordField.hasAttribute('aria-describedby') : false
        };
        
        // Check for labels
        results.labels = {
            name: nameField ? !!document.querySelector('label[for="' + nameField.id + '"]') : false,
            email: emailField ? !!document.querySelector('label[for="' + emailField.id + '"]') : false,
            password: passwordField ? !!document.querySelector('label[for="' + passwordField.id + '"]') : false
        };
        
        results;
        """
        return self.evaluate_javascript(script) or {}
    
    def get_page_errors(self) -> List[str]:
        """Get current page JavaScript errors"""
        return [error['message'] for error in self.errors]
    
    def get_network_calls(self, filter_url: str = None) -> List[Dict]:
        """Get network requests, optionally filtered by URL"""
        if filter_url:
            return [req for req in self.network_requests if filter_url in req['url']]
        return self.network_requests
    
    def close(self):
        """Close WebSocket connection"""
        if self.ws:
            self.ws.close()

def run_e2e_test():
    """Run the complete end-to-end registration test"""
    print("🚀 Starting End-to-End Registration Test")
    print("=" * 50)
    
    # Initialize browser automation
    browser = BrowserAutomation()
    
    # Step 1: Connect to browser
    print("\n📱 Step 1: Connecting to Browser")
    if not browser.connect_to_browser():
        print("❌ Failed to connect to browser")
        return False
    
    # Step 2: Wait for page to load
    print("\n🔄 Step 2: Waiting for Page to Load")
    if not browser.wait_for_element('form', timeout=10):
        print("❌ Registration form not found")
        return False
    
    print("✅ Registration form loaded successfully")
    
    # Step 3: Check accessibility features
    print("\n♿ Step 3: Checking Accessibility Features")
    accessibility_results = browser.check_accessibility()
    
    if accessibility_results:
        print("📋 Accessibility Check Results:")
        for category, checks in accessibility_results.items():
            print(f"  {category}:")
            for field, result in checks.items():
                status = "✅" if result else "❌"
                print(f"    {field}: {status}")
    
    # Step 4: Fill out the form
    print("\n📝 Step 4: Filling Out Registration Form")
    
    # Generate unique test email
    timestamp = int(datetime.now().timestamp())
    test_email = f"e2e.test.{timestamp}@example.com"
    
    form_data = {
        'input[name="name"]': 'E2E Test User',
        'input[name="email"]': test_email,
        'select[name="user_type"]': 'client',
        'input[name="password"]': 'StrongTestPass123!',
        'input[name="confirm_password"]': 'StrongTestPass123!'
    }
    
    # Clear any existing errors
    browser.errors = []
    browser.network_requests = []
    
    # Fill form fields
    for selector, value in form_data.items():
        if selector.startswith('select'):
            # Handle select dropdown
            success = browser.evaluate_javascript(f"""
                const select = document.querySelector('{selector}');
                if (select) {{
                    select.value = '{value}';
                    select.dispatchEvent(new Event('change', {{ bubbles: true }}));
                    true;
                }} else {{
                    false;
                }}
            """)
        else:
            success = browser.fill_form_field(selector, value)
        
        if success:
            print(f"✅ Filled {selector}: {value}")
        else:
            print(f"❌ Failed to fill {selector}")
    
    # Check consent boxes
    print("\n☑️ Step 5: Checking Consent Boxes")
    consent_boxes = [
        'input[name="accept_terms"]',
        'input[name="accept_privacy"]'
    ]
    
    for checkbox in consent_boxes:
        success = browser.click_element(checkbox)
        if success:
            print(f"✅ Checked {checkbox}")
        else:
            print(f"❌ Failed to check {checkbox}")
    
    # Optionally check test data box
    test_data_success = browser.click_element('input[name="use_test_data"]')
    if test_data_success:
        print("✅ Checked test data option")
    
    # Step 6: Submit form and monitor
    print("\n🚀 Step 6: Submitting Form and Monitoring")
    
    # Wait a moment for form to be ready
    time.sleep(1)
    
    # Submit the form
    submit_success = browser.click_element('button[type="submit"]')
    if submit_success:
        print("✅ Form submitted successfully")
    else:
        print("❌ Failed to submit form")
        return False
    
    # Wait for API call and response
    print("\n⏳ Step 7: Waiting for API Response")
    time.sleep(3)  # Wait for API call to complete
    
    # Check for errors
    errors = browser.get_page_errors()
    if errors:
        print("❌ JavaScript Errors Detected:")
        for error in errors:
            print(f"  • {error}")
    else:
        print("✅ No JavaScript errors detected")
    
    # Check network requests
    register_requests = browser.get_network_calls('/api/v1/auth/register')
    if register_requests:
        print("📡 Registration API Calls:")
        for req in register_requests:
            status_emoji = "✅" if 200 <= req['status'] < 300 else "❌"
            print(f"  {status_emoji} {req['method']} {req['url']} - Status: {req['status']}")
    else:
        print("⚠️ No registration API calls detected")
    
    # Check current URL for redirect
    current_url = browser.evaluate_javascript('window.location.href')
    if current_url and 'check-email' in current_url:
        print("✅ Successfully redirected to check-email page")
    else:
        print(f"⚠️ Current URL: {current_url}")
    
    # Step 8: Final verification
    print("\n🔍 Step 8: Final Verification")
    
    # Get all network requests
    all_requests = browser.get_network_calls()
    success_count = sum(1 for req in all_requests if 200 <= req['status'] < 300)
    error_count = sum(1 for req in all_requests if req['status'] >= 400)
    
    print(f"📊 Network Summary:")
    print(f"  Total requests: {len(all_requests)}")
    print(f"  Successful: {success_count}")
    print(f"  Errors: {error_count}")
    
    # Summary
    print("\n📋 Test Summary")
    print("=" * 30)
    
    success_criteria = {
        'Form loaded': browser.wait_for_element('form', timeout=1),
        'No JS errors': len(errors) == 0,
        'Registration API called': len(register_requests) > 0,
        'Successful API response': any(200 <= req['status'] < 300 for req in register_requests),
        'Redirected to check-email': current_url and 'check-email' in current_url
    }
    
    all_passed = all(success_criteria.values())
    
    for criterion, passed in success_criteria.items():
        status = "✅" if passed else "❌"
        print(f"{status} {criterion}")
    
    if all_passed:
        print("\n🎉 All tests passed! Registration flow is working correctly.")
    else:
        print("\n⚠️ Some tests failed. Please check the issues above.")
    
    # Close browser connection
    browser.close()
    
    return all_passed

if __name__ == "__main__":
    success = run_e2e_test()
    exit(0 if success else 1)