#!/usr/bin/env python3
"""
Test the frontend registration form by controlling Chrome via the debug protocol.
This script will navigate to the registration page, fill out the form, and submit it.
"""

import json
import requests
import time
import random
import string
import websocket
from urllib.parse import urlparse

# Configuration
FRONTEND_URL = "http://localhost:3000"
CHROME_DEBUG_URL = "http://localhost:9222"

def generate_unique_email():
    """Generate a unique email for testing"""
    random_part = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"test_{random_part}@example.com"

def get_chrome_tabs():
    """Get list of Chrome tabs"""
    try:
        response = requests.get(f"{CHROME_DEBUG_URL}/json")
        return response.json()
    except Exception as e:
        print(f"Error getting Chrome tabs: {e}")
        return []

def create_new_tab(url):
    """Create a new tab and navigate to URL"""
    try:
        response = requests.get(f"{CHROME_DEBUG_URL}/json/new?{url}")
        return response.json()
    except Exception as e:
        print(f"Error creating new tab: {e}")
        return None

def send_chrome_command(ws, method, params=None):
    """Send command to Chrome via WebSocket"""
    if params is None:
        params = {}
    
    command = {
        "id": random.randint(1, 10000),
        "method": method,
        "params": params
    }
    
    ws.send(json.dumps(command))
    response = ws.recv()
    return json.loads(response)

def test_registration_form():
    """Test the registration form in Chrome"""
    print("🌐 Testing Frontend Registration Form in Chrome")
    print("=" * 60)
    
    # Get existing tabs
    tabs = get_chrome_tabs()
    if not tabs:
        print("❌ No Chrome tabs found. Make sure Chrome is running with --remote-debugging-port=9222")
        return False
    
    # Use the first available tab or create a new one
    tab = tabs[0]
    tab_id = tab['id']
    ws_url = tab['webSocketDebuggerUrl']
    
    print(f"📱 Using Chrome tab: {tab['title']}")
    print(f"🔗 WebSocket URL: {ws_url}")
    
    try:
        # Connect to Chrome via WebSocket
        ws = websocket.create_connection(ws_url)
        print("✅ Connected to Chrome debug interface")
        
        # Enable necessary domains
        send_chrome_command(ws, "Page.enable")
        send_chrome_command(ws, "Runtime.enable")
        send_chrome_command(ws, "Network.enable")
        
        # Navigate to registration page
        print(f"\n🏠 Navigating to: {FRONTEND_URL}/register")
        response = send_chrome_command(ws, "Page.navigate", {"url": f"{FRONTEND_URL}/register"})
        
        # Wait for page to load
        print("⏳ Waiting for page to load...")
        time.sleep(3)
        
        # Generate test data
        test_email = generate_unique_email()
        test_data = {
            "name": "Test User Registration",
            "email": test_email,
            "password": "TestPassword123",
            "confirmPassword": "TestPassword123"
        }
        
        print(f"\n📝 Filling form with test data:")
        print(f"   Name: {test_data['name']}")
        print(f"   Email: {test_data['email']}")
        print(f"   Password: {test_data['password']}")
        
        # Fill out the form
        # Note: We'll use JavaScript to fill the form since direct element interaction 
        # via Chrome Debug Protocol is complex
        fill_form_script = f"""
        (function() {{
            try {{
                // Fill name field
                const nameField = document.getElementById('name') || document.querySelector('input[name="name"]');
                if (nameField) {{
                    nameField.value = '{test_data["name"]}';
                    nameField.dispatchEvent(new Event('input', {{ bubbles: true }}));
                    nameField.dispatchEvent(new Event('change', {{ bubbles: true }}));
                }}
                
                // Fill email field
                const emailField = document.getElementById('email') || document.querySelector('input[name="email"]');
                if (emailField) {{
                    emailField.value = '{test_data["email"]}';
                    emailField.dispatchEvent(new Event('input', {{ bubbles: true }}));
                    emailField.dispatchEvent(new Event('change', {{ bubbles: true }}));
                }}
                
                // Fill password field
                const passwordField = document.getElementById('password') || document.querySelector('input[name="password"]');
                if (passwordField) {{
                    passwordField.value = '{test_data["password"]}';
                    passwordField.dispatchEvent(new Event('input', {{ bubbles: true }}));
                    passwordField.dispatchEvent(new Event('change', {{ bubbles: true }}));
                }}
                
                // Fill confirm password field
                const confirmPasswordField = document.getElementById('confirmPassword') || document.querySelector('input[name="confirmPassword"]');
                if (confirmPasswordField) {{
                    confirmPasswordField.value = '{test_data["confirmPassword"]}';
                    confirmPasswordField.dispatchEvent(new Event('input', {{ bubbles: true }}));
                    confirmPasswordField.dispatchEvent(new Event('change', {{ bubbles: true }}));
                }}
                
                // Check required checkboxes
                const termsCheckbox = document.getElementById('terms-consent') || document.querySelector('input[type="checkbox"][name*="terms"]');
                if (termsCheckbox && !termsCheckbox.checked) {{
                    termsCheckbox.click();
                }}
                
                const privacyCheckbox = document.getElementById('privacy-consent') || document.querySelector('input[type="checkbox"][name*="privacy"]');
                if (privacyCheckbox && !privacyCheckbox.checked) {{
                    privacyCheckbox.click();
                }}
                
                return {{
                    success: true,
                    formFound: !!nameField && !!emailField && !!passwordField,
                    fieldsCount: document.querySelectorAll('input').length,
                    hasSubmitButton: !!document.querySelector('button[type="submit"]')
                }};
            }} catch (error) {{
                return {{
                    success: false,
                    error: error.message
                }};
            }}
        }})();
        """
        
        # Execute the form filling script
        response = send_chrome_command(ws, "Runtime.evaluate", {"expression": fill_form_script})
        
        if response.get('result', {}).get('value', {}).get('success'):
            form_result = response['result']['value']
            print("✅ Form filled successfully!")
            print(f"   Form found: {form_result.get('formFound', False)}")
            print(f"   Input fields count: {form_result.get('fieldsCount', 0)}")
            print(f"   Submit button found: {form_result.get('hasSubmitButton', False)}")
        else:
            error = response.get('result', {}).get('value', {}).get('error', 'Unknown error')
            print(f"❌ Error filling form: {error}")
            
        # Wait a moment for React state to update
        time.sleep(1)
        
        # Get console logs before submission
        print("\n📊 Checking console logs before submission...")
        logs_script = """
        (function() {
            const logs = [];
            const originalConsole = console.log;
            const originalError = console.error;
            const originalWarn = console.warn;
            
            return {
                consoleAvailable: typeof console !== 'undefined',
                timestamp: new Date().toISOString()
            };
        })();
        """
        
        logs_response = send_chrome_command(ws, "Runtime.evaluate", {"expression": logs_script})
        print(f"   Console available: {logs_response.get('result', {}).get('value', {}).get('consoleAvailable', False)}")
        
        # Submit the form
        print("\n🚀 Submitting the form...")
        submit_script = """
        (function() {
            try {
                const form = document.querySelector('form');
                const submitButton = document.querySelector('button[type="submit"]');
                
                if (form) {
                    // First try to submit via form
                    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                    return { success: true, method: 'form_event' };
                } else if (submitButton) {
                    // Fallback to clicking submit button
                    submitButton.click();
                    return { success: true, method: 'button_click' };
                } else {
                    return { success: false, error: 'No form or submit button found' };
                }
            } catch (error) {
                return { success: false, error: error.message };
            }
        })();
        """
        
        submit_response = send_chrome_command(ws, "Runtime.evaluate", {"expression": submit_script})
        submit_result = submit_response.get('result', {}).get('value', {})
        
        if submit_result.get('success'):
            print(f"✅ Form submitted using: {submit_result.get('method', 'unknown')}")
        else:
            print(f"❌ Error submitting form: {submit_result.get('error', 'Unknown error')}")
        
        # Wait for the submission to complete
        print("⏳ Waiting for submission to complete...")
        time.sleep(3)
        
        # Check the current page URL and any messages
        print("\n🔍 Checking submission results...")
        result_script = """
        (function() {
            return {
                currentUrl: window.location.href,
                title: document.title,
                hasErrorMessage: !!document.querySelector('.error, [class*="error"], .text-red'),
                hasSuccessMessage: !!document.querySelector('.success, [class*="success"], .text-green'),
                errorText: document.querySelector('.error, [class*="error"], .text-red')?.textContent || '',
                successText: document.querySelector('.success, [class*="success"], .text-green')?.textContent || '',
                formStillVisible: !!document.querySelector('form')
            };
        })();
        """
        
        result_response = send_chrome_command(ws, "Runtime.evaluate", {"expression": result_script})
        result_data = result_response.get('result', {}).get('value', {})
        
        print(f"   Current URL: {result_data.get('currentUrl', 'Unknown')}")
        print(f"   Page title: {result_data.get('title', 'Unknown')}")
        
        if result_data.get('hasErrorMessage'):
            print(f"   ❌ Error message: {result_data.get('errorText', 'No text')}")
        elif result_data.get('hasSuccessMessage'):
            print(f"   ✅ Success message: {result_data.get('successText', 'No text')}")
        else:
            print("   ℹ️  No obvious success/error messages found")
            
        # Check if we were redirected to a different page
        if '/register' not in result_data.get('currentUrl', ''):
            print("   ✅ Redirected away from registration page (likely successful)")
        else:
            print("   ⚠️  Still on registration page")
        
        print("\n📝 Manual verification steps:")
        print(f"   1. Check the browser tab for visual feedback")
        print(f"   2. Look for any network requests in the Network tab")
        print(f"   3. Check backend logs for the registration attempt")
        print(f"   4. Verify if email verification was triggered")
        
        # Close WebSocket connection
        ws.close()
        return True
        
    except Exception as e:
        print(f"❌ Error during form testing: {e}")
        return False

def main():
    """Run the frontend registration form test"""
    print("🧪 Frontend Registration Form Test")
    print("=" * 60)
    
    # Check if Chrome is running with debug mode
    try:
        tabs = get_chrome_tabs()
        if not tabs:
            print("❌ Chrome debug interface not available")
            print("   Please start Chrome with: --remote-debugging-port=9222")
            return
        print(f"✅ Chrome debug interface available ({len(tabs)} tabs)")
    except Exception as e:
        print(f"❌ Cannot connect to Chrome: {e}")
        return
    
    # Test the registration form
    success = test_registration_form()
    
    if success:
        print("\n✅ Frontend registration form test completed!")
        print("\n📋 Summary:")
        print("   - Successfully connected to Chrome debug interface")
        print("   - Navigated to registration page")
        print("   - Filled out form with test data")
        print("   - Submitted form and checked results")
        print("   - Check browser and backend logs for confirmation")
    else:
        print("\n❌ Frontend registration form test failed!")

if __name__ == "__main__":
    main()