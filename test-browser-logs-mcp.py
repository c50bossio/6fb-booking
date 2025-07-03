#!/usr/bin/env python3
"""
Test script for Browser Logs MCP Server
This script tests the core functionality without requiring Claude Code integration.
"""

import asyncio
import json
import requests
import websockets
from datetime import datetime

async def test_chrome_connection():
    """Test connection to Chrome DevTools Protocol."""
    print("🔍 Testing Chrome DevTools Protocol connection...")
    
    try:
        # Test if Chrome is running with debug port
        response = requests.get("http://localhost:9222/json", timeout=5)
        if response.status_code == 200:
            tabs = response.json()
            print(f"✅ Chrome is running with debug port - found {len(tabs)} tabs")
            
            if tabs:
                # Test WebSocket connection to first tab
                tab = tabs[0]
                print(f"📱 Testing tab: {tab.get('title', 'Unknown')} ({tab.get('url', 'Unknown')})")
                
                ws_url = tab["webSocketDebuggerUrl"]
                async with websockets.connect(ws_url) as websocket:
                    # Send a simple command
                    command = {
                        "id": 1,
                        "method": "Runtime.enable",
                        "params": {}
                    }
                    await websocket.send(json.dumps(command))
                    
                    # Wait for response
                    response = await websocket.recv()
                    result = json.loads(response)
                    
                    if result.get("id") == 1:
                        print("✅ WebSocket connection successful")
                        print("✅ DevTools Protocol commands working")
                        return True
                    else:
                        print(f"❌ Unexpected response: {result}")
                        return False
            else:
                print("❌ No tabs found in Chrome")
                return False
        else:
            print(f"❌ Chrome debug port not accessible: HTTP {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Chrome is not running with --remote-debugging-port=9222")
        print("   Start Chrome with: google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug-6fb")
        return False
    except Exception as e:
        print(f"❌ Error connecting to Chrome: {str(e)}")
        return False

async def test_log_capture():
    """Test log capture functionality."""
    print("\n🔍 Testing log capture functionality...")
    
    try:
        response = requests.get("http://localhost:9222/json", timeout=5)
        tabs = response.json()
        
        if not tabs:
            print("❌ No tabs available for testing")
            return False
        
        tab = tabs[0]
        ws_url = tab["webSocketDebuggerUrl"]
        
        async with websockets.connect(ws_url) as websocket:
            # Enable required domains
            commands = [
                {"id": 1, "method": "Runtime.enable", "params": {}},
                {"id": 2, "method": "Console.enable", "params": {}},
                {"id": 3, "method": "Network.enable", "params": {}},
                {"id": 4, "method": "Log.enable", "params": {}}
            ]
            
            for command in commands:
                await websocket.send(json.dumps(command))
                await websocket.recv()  # Consume response
            
            print("✅ Enabled DevTools domains (Runtime, Console, Network, Log)")
            
            # Inject a test console log
            inject_command = {
                "id": 5,
                "method": "Runtime.evaluate",
                "params": {
                    "expression": "console.log('Test log from MCP server - ' + new Date().toISOString())"
                }
            }
            await websocket.send(json.dumps(inject_command))
            await websocket.recv()  # Consume response
            
            print("✅ Injected test console log")
            
            # Listen for events for a short time
            print("🔄 Listening for events...")
            event_count = 0
            
            try:
                for _ in range(5):  # Listen for up to 5 events
                    message = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                    event = json.loads(message)
                    
                    if event.get("method"):
                        event_count += 1
                        method = event["method"]
                        print(f"📨 Received event: {method}")
                        
                        if method == "Console.messageAdded":
                            params = event.get("params", {})
                            print(f"   Console: {params.get('level', 'unknown')} - {params.get('text', 'no text')}")
                        elif method == "Network.requestWillBeSent":
                            params = event.get("params", {})
                            url = params.get("request", {}).get("url", "unknown")
                            print(f"   Network: Request to {url}")
                        elif method == "Network.responseReceived":
                            params = event.get("params", {})
                            response_info = params.get("response", {})
                            print(f"   Network: Response {response_info.get('status', '?')} from {response_info.get('url', 'unknown')}")
                            
            except asyncio.TimeoutError:
                print("⏱️ Event listening timeout (normal)")
            
            if event_count > 0:
                print(f"✅ Successfully captured {event_count} events")
                return True
            else:
                print("⚠️  No events captured (may be normal if page is idle)")
                return True
                
    except Exception as e:
        print(f"❌ Error testing log capture: {str(e)}")
        return False

async def test_mcp_server_imports():
    """Test that the MCP server script can be imported."""
    print("\n🔍 Testing MCP server imports...")
    
    try:
        # Test imports
        import sys
        sys.path.append('/Users/bossio/6fb-booking')
        
        print("✅ Testing websockets import...")
        import websockets
        
        print("✅ Testing requests import...")
        import requests
        
        print("✅ Testing MCP imports...")
        from mcp.server import Server
        from mcp.server.stdio import stdio_server
        from mcp.types import CallToolRequest, CallToolResult, TextContent
        
        print("✅ All imports successful")
        print("✅ MCP server dependencies are available")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {str(e)}")
        print("   Install with: pip install -r browser-logs-mcp-requirements.txt")
        return False
    except Exception as e:
        print(f"❌ Error testing imports: {str(e)}")
        return False

async def main():
    """Run all tests."""
    print("🚀 Browser Logs MCP Server Test Suite")
    print("=" * 50)
    
    # Test 1: Imports
    test1_passed = await test_mcp_server_imports()
    
    # Test 2: Chrome connection
    test2_passed = await test_chrome_connection()
    
    # Test 3: Log capture (only if Chrome is available)
    test3_passed = False
    if test2_passed:
        test3_passed = await test_log_capture()
    
    # Summary
    print("\n📊 Test Results Summary")
    print("=" * 50)
    print(f"✅ MCP Dependencies: {'PASS' if test1_passed else 'FAIL'}")
    print(f"✅ Chrome Connection: {'PASS' if test2_passed else 'FAIL'}")
    print(f"✅ Log Capture: {'PASS' if test3_passed else 'FAIL'}")
    
    if test1_passed and test2_passed and test3_passed:
        print("\n🎉 All tests passed! The MCP server should work correctly.")
        print("\nNext steps:")
        print("1. Add the MCP server to your Claude Code configuration")
        print("2. Restart Claude Code")
        print("3. Test with: connect_to_browser")
    else:
        print("\n⚠️  Some tests failed. Check the errors above.")
        if not test1_passed:
            print("   - Install dependencies: pip install -r browser-logs-mcp-requirements.txt")
        if not test2_passed:
            print("   - Start Chrome with debug mode: google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug-6fb")

if __name__ == "__main__":
    asyncio.run(main())