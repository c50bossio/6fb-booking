#!/usr/bin/env python3
"""
Live demonstration of Browser Logs MCP functionality
This simulates what Claude Code will do once the MCP server is available
"""

import asyncio
import json
import websockets
from datetime import datetime

async def demo_browser_debugging():
    """Demonstrate browser debugging capabilities."""
    print("🚀 Browser Logs MCP Live Demonstration")
    print("=" * 60)
    
    # Get available tabs
    import requests
    tabs_response = requests.get("http://localhost:9222/json", timeout=10)
    tabs = tabs_response.json()
    
    # Find the 6fb-booking tab
    booking_tab = None
    for tab in tabs:
        if tab.get('type') == 'page' and 'localhost:3001' in tab.get('url', ''):
            booking_tab = tab
            break
    
    if not booking_tab:
        print("❌ 6FB Booking tab not found. Please open http://localhost:3001 in Chrome")
        return
    
    print(f"✅ Found 6FB Booking tab: {booking_tab['title']}")
    print(f"   URL: {booking_tab['url']}")
    print(f"   Tab ID: {booking_tab['id']}")
    print()
    
    # Connect to the tab's WebSocket
    ws_url = booking_tab['webSocketDebuggerUrl']
    print(f"🔌 Connecting to WebSocket: {ws_url}")
    
    try:
        async with websockets.connect(ws_url) as websocket:
            print("✅ Connected to Chrome DevTools Protocol")
            print()
            
            # Enable domains
            print("🔧 Enabling Chrome DevTools domains...")
            domains = ["Runtime", "Console", "Network", "Log"]
            
            for domain in domains:
                command = {
                    "id": len(domains) + 1,
                    "method": f"{domain}.enable",
                    "params": {}
                }
                await websocket.send(json.dumps(command))
                response = await websocket.recv()
                print(f"   ✅ {domain} domain enabled")
            
            print()
            
            # Inject some test console logs
            print("💉 Injecting test console logs...")
            test_commands = [
                "console.log('🔍 Browser Logs MCP Demo - Info message')",
                "console.warn('⚠️ Browser Logs MCP Demo - Warning message')", 
                "console.error('❌ Browser Logs MCP Demo - Error message')",
                "console.log('📊 Page loaded at:', new Date().toISOString())",
                "console.log('🌐 Current URL:', window.location.href)"
            ]
            
            for i, cmd in enumerate(test_commands):
                command = {
                    "id": 100 + i,
                    "method": "Runtime.evaluate",
                    "params": {"expression": cmd}
                }
                await websocket.send(json.dumps(command))
                await websocket.recv()  # Consume response
                print(f"   ✅ Injected: {cmd[:50]}...")
            
            print()
            print("🎧 Listening for browser events...")
            print("   (This simulates what Claude Code will see)")
            print()
            
            # Listen for events
            console_logs = []
            network_requests = []
            js_errors = []
            
            start_time = datetime.now()
            timeout_seconds = 10
            
            while (datetime.now() - start_time).total_seconds() < timeout_seconds:
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    event = json.loads(message)
                    
                    method = event.get("method", "")
                    params = event.get("params", {})
                    timestamp = datetime.now().strftime("%H:%M:%S")
                    
                    if method == "Console.messageAdded":
                        level = params.get("level", "log")
                        text = params.get("text", "")
                        source = params.get("source", "")
                        
                        console_logs.append({
                            "timestamp": timestamp,
                            "level": level,
                            "text": text,
                            "source": source
                        })
                        
                        # Color code by level
                        color = {
                            "error": "\033[91m",
                            "warn": "\033[93m", 
                            "info": "\033[94m",
                            "log": "\033[92m"
                        }.get(level, "\033[0m")
                        
                        print(f"📝 CONSOLE {color}[{level.upper()}]\033[0m [{timestamp}]: {text}")
                        
                        if level == "error":
                            js_errors.append({
                                "timestamp": timestamp,
                                "text": text,
                                "source": source
                            })
                    
                    elif method == "Network.requestWillBeSent":
                        url = params.get("request", {}).get("url", "")
                        method_type = params.get("request", {}).get("method", "")
                        
                        network_requests.append({
                            "timestamp": timestamp,
                            "type": "request",
                            "method": method_type,
                            "url": url
                        })
                        
                        print(f"🌐 NETWORK [{timestamp}] → {method_type} {url[:60]}...")
                    
                    elif method == "Network.responseReceived":
                        url = params.get("response", {}).get("url", "")
                        status = params.get("response", {}).get("status", "")
                        
                        network_requests.append({
                            "timestamp": timestamp,
                            "type": "response", 
                            "status": status,
                            "url": url
                        })
                        
                        status_color = "\033[92m" if str(status).startswith("2") else "\033[91m"
                        print(f"🌐 NETWORK [{timestamp}] ← {status_color}{status}\033[0m {url[:60]}...")
                
                except asyncio.TimeoutError:
                    continue
                except websockets.exceptions.ConnectionClosed:
                    break
            
            print()
            print("📊 Demonstration Summary")
            print("=" * 60)
            print(f"✅ Console logs captured: {len(console_logs)}")
            print(f"✅ Network requests captured: {len(network_requests)}")
            print(f"✅ JavaScript errors captured: {len(js_errors)}")
            print()
            
            if console_logs:
                print("📝 Console Logs:")
                for log in console_logs[-5:]:  # Show last 5
                    print(f"   [{log['timestamp']}] {log['level'].upper()}: {log['text']}")
                print()
            
            if network_requests:
                print("🌐 Network Activity:")
                for req in network_requests[-5:]:  # Show last 5
                    if req['type'] == 'request':
                        print(f"   [{req['timestamp']}] → {req['method']} {req['url'][:50]}...")
                    else:
                        print(f"   [{req['timestamp']}] ← {req['status']} {req['url'][:50]}...")
                print()
            
            print("🎉 Demonstration Complete!")
            print()
            print("💡 Once Claude Desktop is restarted, you can use:")
            print("   • connect_to_browser")
            print("   • get_console_logs level='error'")
            print("   • get_network_requests status_code=404")
            print("   • watch_logs_live duration_seconds=30")
            print("   • get_javascript_errors")
            print()
            print("🚀 This gives Claude Code direct access to browser debugging!")
            
    except Exception as e:
        print(f"❌ Error during demonstration: {e}")

if __name__ == "__main__":
    asyncio.run(demo_browser_debugging())