#!/usr/bin/env python3
"""
Debug Registration Page - Comprehensive Analysis
"""

import json
import requests
import time
import websocket
from datetime import datetime
import threading

class RegistrationDebugger:
    def __init__(self):
        self.tab_id = None
        self.ws = None
        self.logs = []
        self.network_requests = []
        self.errors = []
        self.message_id = 1
        self.responses = {}
        
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
                print("❌ No register tab found. Opening registration page...")
                # Try to open the registration page
                requests.get('http://localhost:9222/json/new?http://localhost:3000/register')
                time.sleep(2)
                # Try again
                response = requests.get('http://localhost:9222/json', timeout=5)
                tabs = response.json()
                for tab in tabs:
                    if 'register' in tab.get('url', '') and tab.get('type') == 'page':
                        register_tab = tab
                        break
                        
            if not register_tab:
                print("❌ Still no register tab found")
                return False
                
            self.tab_id = register_tab['id']
            ws_url = register_tab['webSocketDebuggerUrl']
            
            print(f"✓ Found register tab: {register_tab['url']}")
            print(f"✓ Connecting to WebSocket: {ws_url}")
            
            self.ws = websocket.WebSocketApp(
                ws_url,
                on_open=self.on_open,
                on_message=self.on_message,
                on_error=self.on_error,
                on_close=self.on_close
            )
            
            # Run WebSocket in thread
            self.ws_thread = threading.Thread(target=self.ws.run_forever)
            self.ws_thread.daemon = True
            self.ws_thread.start()
            
            time.sleep(2)  # Give it time to connect
            return True
            
        except Exception as e:
            print(f"❌ Failed to connect: {str(e)}")
            return False
    
    def on_open(self, ws):
        """WebSocket opened"""
        print("✓ WebSocket connected")
        
        # Enable necessary domains
        self.send_command('Console.enable')
        self.send_command('Network.enable')
        self.send_command('Runtime.enable')
        self.send_command('Page.enable')
        
        # Listen for console messages
        self.send_command('Runtime.consoleAPICalled', subscribe=True)
        
    def on_message(self, ws, message):
        """Handle WebSocket messages"""
        data = json.loads(message)
        
        # Handle console messages
        if data.get('method') == 'Runtime.consoleAPICalled':
            self.handle_console_message(data['params'])
            
        # Handle network requests
        elif data.get('method') == 'Network.requestWillBeSent':
            self.handle_network_request(data['params'])
            
        # Handle network responses
        elif data.get('method') == 'Network.responseReceived':
            self.handle_network_response(data['params'])
            
        # Handle exceptions
        elif data.get('method') == 'Runtime.exceptionThrown':
            self.handle_exception(data['params'])
            
        # Store responses to our commands
        if 'id' in data:
            self.responses[data['id']] = data
    
    def on_error(self, ws, error):
        """WebSocket error"""
        print(f"❌ WebSocket error: {error}")
    
    def on_close(self, ws):
        """WebSocket closed"""
        print("WebSocket closed")
    
    def send_command(self, method, params=None, subscribe=False):
        """Send command to browser"""
        if not self.ws:
            return None
            
        command = {
            'id': self.message_id,
            'method': method
        }
        
        if params:
            command['params'] = params
            
        self.message_id += 1
        self.ws.send(json.dumps(command))
        
        return command['id']
    
    def handle_console_message(self, params):
        """Handle console log"""
        try:
            level = params.get('type', 'log')
            args = params.get('args', [])
            
            # Extract message text
            messages = []
            for arg in args:
                if arg.get('type') == 'string':
                    messages.append(arg.get('value', ''))
                elif arg.get('type') == 'object':
                    messages.append(str(arg.get('preview', {}).get('description', '')))
            
            message = ' '.join(messages)
            timestamp = datetime.now().strftime('%H:%M:%S')
            
            log_entry = {
                'timestamp': timestamp,
                'level': level,
                'message': message
            }
            
            self.logs.append(log_entry)
            
            # Track errors separately
            if level in ['error', 'warning']:
                self.errors.append(log_entry)
                
        except Exception as e:
            print(f"Error handling console message: {e}")
    
    def handle_network_request(self, params):
        """Handle network request"""
        request = params.get('request', {})
        url = request.get('url', '')
        method = request.get('method', '')
        
        # Only track API requests
        if 'api' in url or 'localhost:8000' in url:
            self.network_requests.append({
                'timestamp': datetime.now().strftime('%H:%M:%S'),
                'method': method,
                'url': url,
                'requestId': params.get('requestId'),
                'status': 'pending'
            })
    
    def handle_network_response(self, params):
        """Handle network response"""
        response = params.get('response', {})
        request_id = params.get('requestId')
        
        # Update the request with response info
        for req in self.network_requests:
            if req.get('requestId') == request_id:
                req['status'] = response.get('status')
                req['statusText'] = response.get('statusText', '')
                break
    
    def handle_exception(self, params):
        """Handle JavaScript exception"""
        exception = params.get('exceptionDetails', {})
        
        self.errors.append({
            'timestamp': datetime.now().strftime('%H:%M:%S'),
            'level': 'exception',
            'message': exception.get('text', 'Unknown error'),
            'stackTrace': exception.get('stackTrace', {})
        })
    
    def evaluate_script(self, script):
        """Evaluate JavaScript in the page"""
        cmd_id = self.send_command('Runtime.evaluate', {
            'expression': script,
            'returnByValue': True
        })
        
        # Wait for response
        time.sleep(1)
        
        response = self.responses.get(cmd_id)
        if response and 'result' in response:
            result = response['result'].get('result', {})
            return result.get('value')
        return None
    
    def analyze_page(self):
        """Perform comprehensive page analysis"""
        print("\n=== REGISTRATION PAGE ANALYSIS ===\n")
        
        # Check React errors
        print("1. Checking for React errors...")
        react_errors = self.evaluate_script("""
            (function() {
                const errors = [];
                const errorElements = document.querySelectorAll('[data-reactroot] + script');
                errorElements.forEach(el => {
                    if (el.textContent.includes('Error')) {
                        errors.push(el.textContent);
                    }
                });
                return errors;
            })()
        """)
        
        if react_errors:
            print(f"❌ Found React errors: {react_errors}")
        else:
            print("✓ No React hydration errors found")
        
        # Check page structure
        print("\n2. Checking page structure...")
        page_info = self.evaluate_script("""
            (function() {
                return {
                    title: document.title,
                    hasForm: !!document.querySelector('form'),
                    formInputs: Array.from(document.querySelectorAll('input')).map(i => ({
                        name: i.name,
                        type: i.type,
                        id: i.id,
                        placeholder: i.placeholder
                    })),
                    buttons: Array.from(document.querySelectorAll('button')).map(b => ({
                        text: b.textContent.trim(),
                        disabled: b.disabled,
                        type: b.type,
                        onclick: !!b.onclick
                    })),
                    errorMessages: Array.from(document.querySelectorAll('.error, .text-red-500, [role="alert"]'))
                        .map(e => e.textContent.trim())
                };
            })()
        """)
        
        if page_info:
            print(f"✓ Page title: {page_info.get('title', 'N/A')}")
            print(f"✓ Has form: {page_info.get('hasForm', False)}")
            print(f"✓ Form inputs: {len(page_info.get('formInputs', []))}")
            for inp in page_info.get('formInputs', []):
                print(f"  - {inp.get('type', 'text')}: {inp.get('name', inp.get('id', 'unnamed'))}")
            print(f"✓ Buttons: {len(page_info.get('buttons', []))}")
            for btn in page_info.get('buttons', []):
                status = "✓" if not btn.get('disabled') else "❌"
                print(f"  {status} {btn.get('text', 'Unnamed')} (disabled: {btn.get('disabled')})")
            
            if page_info.get('errorMessages'):
                print(f"❌ Error messages found:")
                for err in page_info['errorMessages']:
                    print(f"  - {err}")
        
        # Check specific registration elements
        print("\n3. Checking registration-specific elements...")
        reg_elements = self.evaluate_script("""
            (function() {
                return {
                    hasBusinessTypeSelection: !!document.querySelector('[data-testid="business-type-selection"]'),
                    hasAccountSetup: !!document.querySelector('[data-testid="account-setup"]'),
                    hasPaymentSetup: !!document.querySelector('[data-testid="payment-setup"]'),
                    currentStep: document.querySelector('[data-current-step]')?.getAttribute('data-current-step'),
                    progressIndicator: document.querySelector('.progress-bar, [role="progressbar"]')?.getAttribute('aria-valuenow')
                };
            })()
        """)
        
        if reg_elements:
            print(f"✓ Business Type Selection: {reg_elements.get('hasBusinessTypeSelection', False)}")
            print(f"✓ Account Setup: {reg_elements.get('hasAccountSetup', False)}")
            print(f"✓ Payment Setup: {reg_elements.get('hasPaymentSetup', False)}")
            print(f"✓ Current Step: {reg_elements.get('currentStep', 'Unknown')}")
        
        # Test button clicks
        print("\n4. Testing button functionality...")
        click_test = self.evaluate_script("""
            (function() {
                const results = [];
                const buttons = document.querySelectorAll('button:not([disabled])');
                
                buttons.forEach((btn, idx) => {
                    const text = btn.textContent.trim();
                    let clickable = true;
                    let hasHandler = false;
                    
                    // Check for click handlers
                    if (btn.onclick || btn.hasAttribute('onClick')) {
                        hasHandler = true;
                    }
                    
                    // Check for React handlers
                    const reactProps = Object.keys(btn).find(key => key.startsWith('__reactProps'));
                    if (reactProps && btn[reactProps] && btn[reactProps].onClick) {
                        hasHandler = true;
                    }
                    
                    results.push({
                        text: text,
                        hasHandler: hasHandler,
                        disabled: btn.disabled
                    });
                });
                
                return results;
            })()
        """)
        
        if click_test:
            for btn in click_test:
                status = "✓" if btn.get('hasHandler') else "❌"
                print(f"  {status} '{btn.get('text', 'Unnamed')}' - Has handler: {btn.get('hasHandler')}")
        
        # Console logs
        print("\n5. Console Logs:")
        if self.logs:
            for log in self.logs[-10:]:  # Last 10 logs
                icon = "❌" if log['level'] == 'error' else "⚠️" if log['level'] == 'warning' else "ℹ️"
                print(f"  {icon} [{log['timestamp']}] {log['level']}: {log['message']}")
        else:
            print("  No console logs captured")
        
        # JavaScript errors
        print("\n6. JavaScript Errors:")
        if self.errors:
            for error in self.errors:
                print(f"  ❌ [{error['timestamp']}] {error['message']}")
                if 'stackTrace' in error and error['stackTrace']:
                    print(f"     Stack trace available")
        else:
            print("  ✓ No JavaScript errors")
        
        # Network requests
        print("\n7. API Requests:")
        if self.network_requests:
            for req in self.network_requests:
                status_icon = "✓" if req.get('status', 0) < 400 else "❌"
                print(f"  {status_icon} {req['method']} {req['url']} - Status: {req.get('status', 'pending')}")
        else:
            print("  No API requests captured")
        
        # Specific issue: Subscription button
        print("\n8. Checking subscription/pricing step...")
        pricing_check = self.evaluate_script("""
            (function() {
                const pricingSection = document.querySelector('[data-testid="payment-setup"], .pricing-section, [class*="pricing"]');
                const subscribeButton = document.querySelector('button[type="submit"]:contains("Subscribe"), button:contains("Continue to Payment")');
                
                return {
                    hasPricingSection: !!pricingSection,
                    pricingSectionVisible: pricingSection ? window.getComputedStyle(pricingSection).display !== 'none' : false,
                    hasSubscribeButton: !!subscribeButton,
                    subscribeButtonText: subscribeButton?.textContent.trim(),
                    subscribeButtonDisabled: subscribeButton?.disabled,
                    formAction: document.querySelector('form')?.action,
                    formMethod: document.querySelector('form')?.method
                };
            })()
        """)
        
        if pricing_check:
            print(f"  Pricing section present: {pricing_check.get('hasPricingSection')}")
            print(f"  Pricing section visible: {pricing_check.get('pricingSectionVisible')}")
            print(f"  Subscribe button: {pricing_check.get('subscribeButtonText', 'Not found')}")
            print(f"  Button disabled: {pricing_check.get('subscribeButtonDisabled', 'N/A')}")

def main():
    print("=== BookedBarber Registration Page Debugger ===\n")
    
    debugger = RegistrationDebugger()
    
    print("Connecting to browser...")
    if not debugger.connect_to_browser():
        print("❌ Failed to connect to browser")
        print("\nMake sure Chrome is running with debugging:")
        print("google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug-6fb")
        return
    
    print("✓ Connected successfully")
    print("\nMonitoring page for 10 seconds...")
    
    # Let it collect data
    time.sleep(10)
    
    # Analyze the page
    debugger.analyze_page()
    
    print("\n=== ANALYSIS COMPLETE ===")
    
    # Close connection
    if debugger.ws:
        debugger.ws.close()

if __name__ == "__main__":
    main()