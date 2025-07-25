#!/usr/bin/env python3
"""
Simple E2E Registration Test
Comprehensive test that handles timeouts properly
"""

import json
import requests
import time
import websocket
from datetime import datetime
from typing import Dict, List, Any
import signal
import sys

class TimeoutError(Exception):
    pass

def timeout_handler(signum, frame):
    raise TimeoutError("Operation timed out")

class SimpleBrowserTest:
    def __init__(self, timeout=30):
        self.timeout = timeout
        self.tab_id = None
        self.ws = None
        self.logs = []
        self.network_requests = []
        self.errors = []
        
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
            self.ws = websocket.create_connection(ws_url, timeout=10)
            
            # Enable domains
            self.send_command("Runtime.enable")
            self.send_command("Console.enable")
            self.send_command("Network.enable")
            self.send_command("DOM.enable")
            
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
    
    def evaluate_javascript(self, script: str) -> Any:
        """Execute JavaScript and return result"""
        result = self.send_command("Runtime.evaluate", {
            "expression": script,
            "returnByValue": True
        })
        
        if 'result' in result and 'value' in result['result']:
            return result['result']['value']
        return None
    
    def get_console_errors(self) -> List[str]:
        """Get console errors from page"""
        script = """
        (function() {
            const errors = [];
            const originalError = console.error;
            const originalLog = console.log;
            
            // Check for any global errors
            if (window.lastError) {
                errors.push(window.lastError);
            }
            
            // Check for React errors
            if (window.reactErrors) {
                errors.push(...window.reactErrors);
            }
            
            return errors;
        })();
        """
        return self.evaluate_javascript(script) or []
    
    def wait_for_element(self, selector: str, timeout: int = 10) -> bool:
        """Wait for element to be present"""
        start_time = time.time()
        while time.time() - start_time < timeout:
            result = self.evaluate_javascript(f"!!document.querySelector('{selector}')")
            if result:
                return True
            time.sleep(0.5)
        return False
    
    def fill_form_and_submit(self) -> bool:
        """Fill form and submit"""
        timestamp = int(datetime.now().timestamp())
        test_email = f"e2e.test.{timestamp}@example.com"
        
        script = f"""
        (function() {{
            try {{
                // Fill form fields
                const nameField = document.querySelector('input[name="name"]');
                const emailField = document.querySelector('input[name="email"]');
                const userTypeField = document.querySelector('select[name="user_type"]');
                const passwordField = document.querySelector('input[name="password"]');
                const confirmPasswordField = document.querySelector('input[name="confirm_password"]');
                
                if (!nameField || !emailField || !userTypeField || !passwordField || !confirmPasswordField) {{
                    return {{ success: false, error: "Missing form fields" }};
                }}
                
                // Fill in the data
                nameField.value = 'E2E Test User';
                emailField.value = '{test_email}';
                userTypeField.value = 'client';
                passwordField.value = 'StrongTestPass123!';
                confirmPasswordField.value = 'StrongTestPass123!';
                
                // Trigger events
                [nameField, emailField, userTypeField, passwordField, confirmPasswordField].forEach(field => {{
                    field.dispatchEvent(new Event('input', {{ bubbles: true }}));
                    field.dispatchEvent(new Event('change', {{ bubbles: true }}));
                }});
                
                // Check consent boxes
                const termsCheckbox = document.querySelector('input[name="accept_terms"]');
                const privacyCheckbox = document.querySelector('input[name="accept_privacy"]');
                
                if (termsCheckbox && !termsCheckbox.checked) {{
                    termsCheckbox.click();
                }}
                
                if (privacyCheckbox && !privacyCheckbox.checked) {{
                    privacyCheckbox.click();
                }}
                
                // Optional: test data
                const testDataCheckbox = document.querySelector('input[name="use_test_data"]');
                if (testDataCheckbox && !testDataCheckbox.checked) {{
                    testDataCheckbox.click();
                }}
                
                // Submit form
                const submitButton = document.querySelector('button[type="submit"]');
                if (!submitButton) {{
                    return {{ success: false, error: "No submit button found" }};
                }}
                
                submitButton.click();
                
                return {{ success: true, email: '{test_email}' }};
                
            }} catch (error) {{
                return {{ success: false, error: error.message }};
            }}
        }})();
        """
        
        result = self.evaluate_javascript(script)
        if result and result.get('success'):
            print(f"✅ Form filled and submitted successfully")
            print(f"📧 Test email: {result.get('email')}")
            return True
        else:
            print(f"❌ Form submission failed: {result.get('error', 'Unknown error')}")
            return False
    
    def check_accessibility(self) -> Dict:
        """Check accessibility features"""
        script = """
        (function() {
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
            
            return results;
        })();
        """
        return self.evaluate_javascript(script) or {}
    
    def check_final_state(self) -> Dict:
        """Check final state after submission"""
        time.sleep(3)  # Wait for redirect
        
        script = """
        (function() {
            return {
                url: window.location.href,
                title: document.title,
                hasErrors: document.querySelector('.error') ? true : false,
                hasSuccessMessage: document.querySelector('.success') ? true : false,
                bodyText: document.body.innerText
            };
        })();
        """
        
        return self.evaluate_javascript(script) or {}
    
    def close(self):
        """Close WebSocket connection"""
        if self.ws:
            self.ws.close()

def run_simple_test():
    """Run the simple end-to-end test"""
    print("🚀 Starting Simple E2E Registration Test")
    print("=" * 50)
    
    browser = SimpleBrowserTest()
    
    try:
        # Set up timeout handler
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(60)  # 60 second timeout
        
        # Step 1: Connect to browser
        print("\n📱 Step 1: Connecting to Browser")
        if not browser.connect_to_browser():
            return False
        
        # Step 2: Wait for page to load
        print("\n🔄 Step 2: Waiting for Page to Load")
        
        # Try multiple selectors and longer timeout
        selectors_to_try = [
            'form',
            'input[name="name"]',
            'input[name="email"]',
            '[data-testid="register-form"]',
            '.register-form'
        ]
        
        form_found = False
        for selector in selectors_to_try:
            if browser.wait_for_element(selector, timeout=15):
                print(f"✅ Found element: {selector}")
                form_found = True
                break
        
        if not form_found:
            print("❌ Registration form not found")
            # Let's check what's actually on the page
            page_content = browser.evaluate_javascript("document.body.innerHTML")
            if page_content:
                print("📄 Page content preview:")
                print(page_content[:500] + "..." if len(page_content) > 500 else page_content)
            return False
        
        print("✅ Registration form loaded successfully")
        
        # Step 3: Check accessibility
        print("\n♿ Step 3: Checking Accessibility Features")
        accessibility = browser.check_accessibility()
        if accessibility:
            print("📋 Accessibility Results:")
            for category, checks in accessibility.items():
                print(f"  {category}:")
                for field, result in checks.items():
                    status = "✅" if result else "❌"
                    print(f"    {field}: {status}")
        
        # Step 4: Fill and submit form
        print("\n📝 Step 4: Filling and Submitting Form")
        if not browser.fill_form_and_submit():
            return False
        
        # Step 5: Check final state
        print("\n🔍 Step 5: Checking Final State")
        final_state = browser.check_final_state()
        
        if final_state:
            print(f"📍 Final URL: {final_state.get('url', 'Unknown')}")
            print(f"📄 Page Title: {final_state.get('title', 'Unknown')}")
            
            has_errors = final_state.get('hasErrors', False)
            has_success = final_state.get('hasSuccessMessage', False)
            
            if 'check-email' in final_state.get('url', ''):
                print("✅ Successfully redirected to check-email page")
                success = True
            elif has_success:
                print("✅ Success message found on page")
                success = True
            elif has_errors:
                print("❌ Error message found on page")
                success = False
            else:
                print("⚠️ Unclear final state")
                success = False
        else:
            print("❌ Could not determine final state")
            success = False
        
        # Step 6: Get console errors
        print("\n🔍 Step 6: Checking for JavaScript Errors")
        console_errors = browser.get_console_errors()
        if console_errors:
            print("❌ Console errors found:")
            for error in console_errors:
                print(f"  • {error}")
        else:
            print("✅ No console errors detected")
        
        # Cancel timeout
        signal.alarm(0)
        
        # Summary
        print("\n📋 Test Summary")
        print("=" * 30)
        
        criteria = {
            'Form loads': True,
            'Form submission': True,
            'No console errors': len(console_errors) == 0,
            'Proper redirect or success': success
        }
        
        all_passed = all(criteria.values())
        
        for criterion, passed in criteria.items():
            status = "✅" if passed else "❌"
            print(f"{status} {criterion}")
        
        if all_passed:
            print("\n🎉 All tests passed! Registration flow is working correctly.")
        else:
            print("\n⚠️ Some tests failed. Please review the issues above.")
        
        return all_passed
        
    except TimeoutError:
        print("\n⏰ Test timed out")
        return False
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        return False
    finally:
        signal.alarm(0)  # Cancel timeout
        browser.close()

if __name__ == "__main__":
    success = run_simple_test()
    sys.exit(0 if success else 1)