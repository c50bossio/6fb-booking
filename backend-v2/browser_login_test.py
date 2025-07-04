#!/usr/bin/env python3
"""
Comprehensive browser login test with full monitoring
"""
import asyncio
import json
import time
from typing import Dict, List, Any
import websockets
import aiohttp

class BrowserAutomation:
    def __init__(self):
        self.ws = None
        self.session_id = None
        self.console_logs = []
        self.network_logs = []
        self.errors = []
        
    async def connect(self):
        """Connect to Chrome DevTools"""
        try:
            # Get browser tabs
            async with aiohttp.ClientSession() as session:
                async with session.get('http://localhost:9222/json/list') as resp:
                    tabs = await resp.json()
                    if not tabs:
                        print("❌ No browser tabs found")
                        return False
                    
                    ws_url = tabs[0]['webSocketDebuggerUrl']
                    print(f"🔌 Connecting to: {ws_url}")
            
            # Connect to WebSocket
            self.ws = await websockets.connect(ws_url)
            
            # Enable domains
            await self.send_command("Console.enable")
            await self.send_command("Network.enable")
            await self.send_command("Runtime.enable")
            await self.send_command("Page.enable")
            
            print("✅ Connected to Chrome DevTools")
            return True
            
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            return False
    
    async def send_command(self, method: str, params: Dict = None) -> Dict:
        """Send command to Chrome DevTools"""
        command = {
            "id": int(time.time() * 1000),
            "method": method,
            "params": params or {}
        }
        
        await self.ws.send(json.dumps(command))
        
        # Wait for response
        while True:
            response = await self.ws.recv()
            data = json.loads(response)
            
            # Handle events
            if 'method' in data:
                await self.handle_event(data)
            elif data.get('id') == command['id']:
                return data.get('result', {})
    
    async def handle_event(self, data: Dict):
        """Handle Chrome DevTools events"""
        method = data.get('method', '')
        params = data.get('params', {})
        
        # Console messages
        if method == 'Console.messageAdded':
            message = params.get('message', {})
            level = message.get('level', 'log')
            text = message.get('text', '')
            
            self.console_logs.append({
                'level': level,
                'text': text,
                'timestamp': time.time()
            })
            
            # Print important logs
            if any(marker in text for marker in ['🚀', '✅', '❌', 'error', 'Error', 'failed', 'Failed']):
                print(f"📝 [{level.upper()}] {text}")
        
        # Network events
        elif method == 'Network.requestWillBeSent':
            request = params.get('request', {})
            url = request.get('url', '')
            
            if 'api/v1/auth/login' in url:
                print(f"🌐 Login request sent to: {url}")
                self.network_logs.append({
                    'type': 'request',
                    'url': url,
                    'method': request.get('method', ''),
                    'timestamp': time.time()
                })
        
        elif method == 'Network.responseReceived':
            response = params.get('response', {})
            url = response.get('url', '')
            status = response.get('status', 0)
            
            if 'api/v1/auth/login' in url:
                print(f"🌐 Login response: {status} from {url}")
                self.network_logs.append({
                    'type': 'response',
                    'url': url,
                    'status': status,
                    'timestamp': time.time()
                })
        
        # Runtime exceptions
        elif method == 'Runtime.exceptionThrown':
            exception = params.get('exceptionDetails', {})
            text = exception.get('text', '')
            print(f"🚨 JavaScript Exception: {text}")
            self.errors.append({
                'type': 'exception',
                'text': text,
                'timestamp': time.time()
            })
    
    async def navigate_to_login(self):
        """Navigate to login page"""
        print("🧭 Navigating to login page...")
        result = await self.send_command("Page.navigate", {
            "url": "http://localhost:3000/login"
        })
        
        # Wait for page load
        await asyncio.sleep(3)
        return result
    
    async def check_api_connectivity(self):
        """Test direct API connectivity"""
        print("\n🔍 Testing API connectivity...")
        
        script = """
        fetch('http://localhost:8000/api/v1/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin.test@bookedbarber.com',
                password: 'AdminTest123'
            })
        })
        .then(response => {
            console.log('✅ API Response Status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('✅ API Response Data:', JSON.stringify(data).substring(0, 100) + '...');
        })
        .catch(error => {
            console.error('❌ API Fetch Error:', error.toString());
        });
        """
        
        await self.send_command("Runtime.evaluate", {
            "expression": script,
            "awaitPromise": True
        })
        
        # Wait for fetch to complete
        await asyncio.sleep(2)
    
    async def fill_and_submit_form(self):
        """Fill login form and submit"""
        print("\n📝 Filling login form...")
        
        # Fill email
        email_script = """
        const emailField = document.getElementById('email');
        if (emailField) {
            emailField.value = 'admin.test@bookedbarber.com';
            emailField.dispatchEvent(new Event('input', {bubbles: true}));
            emailField.dispatchEvent(new Event('change', {bubbles: true}));
            console.log('✅ Email field filled');
            true;
        } else {
            console.error('❌ Email field not found');
            false;
        }
        """
        
        result = await self.send_command("Runtime.evaluate", {
            "expression": email_script,
            "returnByValue": True
        })
        
        await asyncio.sleep(0.5)
        
        # Fill password
        password_script = """
        const passwordField = document.getElementById('password');
        if (passwordField) {
            passwordField.value = 'AdminTest123';
            passwordField.dispatchEvent(new Event('input', {bubbles: true}));
            passwordField.dispatchEvent(new Event('change', {bubbles: true}));
            console.log('✅ Password field filled');
            true;
        } else {
            console.error('❌ Password field not found');
            false;
        }
        """
        
        result = await self.send_command("Runtime.evaluate", {
            "expression": password_script,
            "returnByValue": True
        })
        
        await asyncio.sleep(0.5)
        
        # Submit form
        print("🚀 Submitting login form...")
        
        submit_script = """
        const submitButton = document.querySelector('button[type="submit"]');
        if (submitButton) {
            console.log('🚀 Clicking submit button...');
            submitButton.click();
            true;
        } else {
            console.error('❌ Submit button not found');
            false;
        }
        """
        
        await self.send_command("Runtime.evaluate", {
            "expression": submit_script,
            "returnByValue": True
        })
        
        # Wait for response
        await asyncio.sleep(5)
    
    async def get_current_url(self):
        """Get current page URL"""
        result = await self.send_command("Runtime.evaluate", {
            "expression": "window.location.href",
            "returnByValue": True
        })
        return result.get('value', '')
    
    def analyze_results(self):
        """Analyze captured logs"""
        print("\n" + "="*60)
        print("📊 LOGIN TEST ANALYSIS")
        print("="*60)
        
        # Console errors
        error_logs = [log for log in self.console_logs if log['level'] in ['error', 'warning']]
        if error_logs:
            print(f"\n🚨 Found {len(error_logs)} console errors:")
            for log in error_logs[-5:]:  # Last 5 errors
                print(f"   [{log['level'].upper()}] {log['text'][:100]}...")
        
        # Network requests
        if self.network_logs:
            print(f"\n🌐 Network Activity:")
            for log in self.network_logs:
                if log['type'] == 'request':
                    print(f"   → {log['method']} {log['url']}")
                else:
                    print(f"   ← {log['status']} {log['url']}")
        else:
            print("\n⚠️  No login API requests detected!")
        
        # JavaScript exceptions
        if self.errors:
            print(f"\n🚨 JavaScript Exceptions:")
            for error in self.errors:
                print(f"   {error['text']}")
        
        # Success indicators
        success_logs = [log for log in self.console_logs if '✅' in log['text']]
        if success_logs:
            print(f"\n✅ Success Messages:")
            for log in success_logs[-3:]:
                print(f"   {log['text']}")

async def main():
    print("🌐 Starting Comprehensive Browser Login Test")
    print("="*60)
    
    browser = BrowserAutomation()
    
    try:
        # Connect to browser
        if not await browser.connect():
            return
        
        # Navigate to login page
        await browser.navigate_to_login()
        
        # Test API connectivity directly
        await browser.check_api_connectivity()
        
        # Fill and submit form
        await browser.fill_and_submit_form()
        
        # Check if we redirected
        current_url = await browser.get_current_url()
        print(f"\n📍 Current URL: {current_url}")
        
        if '/dashboard' in current_url:
            print("✅ Successfully redirected to dashboard!")
        elif '/login' in current_url:
            print("❌ Still on login page - login failed")
        
        # Analyze results
        browser.analyze_results()
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
    
    finally:
        if browser.ws:
            await browser.ws.close()
        
        print("\n🔚 Test completed")

if __name__ == "__main__":
    asyncio.run(main())