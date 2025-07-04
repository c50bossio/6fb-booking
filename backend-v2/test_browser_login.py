#!/usr/bin/env python3
"""
Test browser login by connecting to Chrome DevTools and automating the login process
"""
import json
import time
import websocket
import threading
import requests

class BrowserController:
    def __init__(self):
        self.ws = None
        self.connected = False
        self.logs = []
        self.network_requests = []
        
    def connect(self):
        try:
            # Get the WebSocket URL
            tabs = requests.get('http://localhost:9222/json/list').json()
            if not tabs:
                print("❌ No browser tabs found")
                return False
                
            ws_url = tabs[0]['webSocketDebuggerUrl']
            print(f"🔌 Connecting to: {ws_url}")
            
            self.ws = websocket.WebSocketApp(
                ws_url,
                on_message=self.on_message,
                on_error=self.on_error,
                on_close=self.on_close,
                on_open=self.on_open
            )
            
            # Start WebSocket in a separate thread
            self.ws_thread = threading.Thread(target=self.ws.run_forever)
            self.ws_thread.daemon = True
            self.ws_thread.start()
            
            # Wait for connection
            time.sleep(2)
            return self.connected
            
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            return False
    
    def on_open(self, ws):
        print("✅ Connected to Chrome DevTools")
        self.connected = True
        
        # Enable Console and Network domains
        self.send_command("Console.enable")
        self.send_command("Network.enable")
        self.send_command("Runtime.enable")
        
    def on_message(self, ws, message):
        try:
            data = json.loads(message)
            
            # Console logs
            if data.get('method') == 'Console.messageAdded':
                msg = data['params']['message']
                level = msg.get('level', 'log')
                text = msg.get('text', '')
                
                if any(keyword in text for keyword in ['🚀', '✅', '❌', 'login', 'Login', 'error', 'Error']):
                    print(f"📝 [{level.upper()}] {text}")
                    self.logs.append(f"[{level}] {text}")
                    
            # Network requests
            elif data.get('method') == 'Network.responseReceived':
                response = data['params']['response']
                url = response.get('url', '')
                status = response.get('status', 0)
                
                if 'auth/login' in url:
                    print(f"🌐 Login API Response: {status} - {url}")
                    self.network_requests.append({
                        'url': url,
                        'status': status,
                        'timestamp': time.time()
                    })
                    
        except json.JSONDecodeError:
            pass
        except Exception as e:
            print(f"⚠️ Message handling error: {e}")
    
    def on_error(self, ws, error):
        print(f"🚨 WebSocket error: {error}")
    
    def on_close(self, ws, close_status_code, close_msg):
        print("🔌 Connection closed")
        self.connected = False
    
    def send_command(self, method, params=None):
        if not self.connected:
            return False
            
        command = {
            "id": int(time.time() * 1000),
            "method": method,
            "params": params or {}
        }
        
        try:
            self.ws.send(json.dumps(command))
            return True
        except Exception as e:
            print(f"❌ Command failed: {e}")
            return False
    
    def navigate_to_login(self):
        """Navigate to the login page"""
        print("🧭 Navigating to login page...")
        return self.send_command("Page.navigate", {"url": "http://localhost:3000/login"})
    
    def fill_login_form(self):
        """Fill in the login form with admin credentials"""
        print("📝 Filling login form...")
        
        # Fill email field
        email_script = """
        document.getElementById('email').value = 'admin.test@bookedbarber.com';
        document.getElementById('email').dispatchEvent(new Event('input', {bubbles: true}));
        """
        self.send_command("Runtime.evaluate", {"expression": email_script})
        
        time.sleep(0.5)
        
        # Fill password field
        password_script = """
        document.getElementById('password').value = 'AdminTest123';
        document.getElementById('password').dispatchEvent(new Event('input', {bubbles: true}));
        """
        self.send_command("Runtime.evaluate", {"expression": password_script})
        
        time.sleep(0.5)
        return True
    
    def submit_login(self):
        """Submit the login form"""
        print("🚀 Submitting login form...")
        
        submit_script = """
        const form = document.querySelector('form');
        if (form) {
            form.dispatchEvent(new Event('submit', {bubbles: true}));
        } else {
            const submitButton = document.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.click();
            }
        }
        """
        return self.send_command("Runtime.evaluate", {"expression": submit_script})
    
    def get_current_url(self):
        """Get current page URL"""
        result = self.send_command("Runtime.evaluate", {"expression": "window.location.href"})
        return result

def main():
    print("🌐 Starting Browser Login Test")
    print("=" * 50)
    
    # Create browser controller
    browser = BrowserController()
    
    # Connect to browser
    if not browser.connect():
        print("❌ Failed to connect to Chrome. Make sure Chrome is running with --remote-debugging-port=9222")
        return
    
    try:
        # Step 1: Navigate to login page
        time.sleep(1)
        browser.navigate_to_login()
        print("⏳ Waiting for page to load...")
        time.sleep(3)
        
        # Step 2: Fill login form
        browser.fill_login_form()
        print("⏳ Form filled, waiting...")
        time.sleep(2)
        
        # Step 3: Submit login
        browser.submit_login()
        print("⏳ Login submitted, monitoring response...")
        time.sleep(5)
        
        # Step 4: Check results
        print("\n" + "=" * 50)
        print("📊 LOGIN TEST RESULTS")
        print("=" * 50)
        
        if browser.logs:
            print("\n📝 Console Logs:")
            for log in browser.logs[-10:]:  # Last 10 logs
                print(f"   {log}")
        
        if browser.network_requests:
            print("\n🌐 Network Requests:")
            for req in browser.network_requests:
                print(f"   {req['status']} - {req['url']}")
        
        # Check if we're on dashboard
        current_url_script = "window.location.href"
        browser.send_command("Runtime.evaluate", {"expression": current_url_script})
        
        print("\n✅ Login test completed!")
        
    except KeyboardInterrupt:
        print("\n⏹️ Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
    
    print("\n🔚 Test finished")

if __name__ == "__main__":
    main()