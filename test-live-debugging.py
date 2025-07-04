#!/usr/bin/env python3
"""
Test live debugging with realistic 6fb-booking interactions
"""

import asyncio
import json
import websockets
import requests
from datetime import datetime

async def test_live_debugging():
    """Test live debugging with the 6fb-booking application."""
    print("🚀 Testing Live Browser Debugging with 6FB Booking")
    print("=" * 60)
    
    # Get the 6fb-booking tab
    tabs_response = requests.get("http://localhost:9222/json")
    tabs = tabs_response.json()
    
    booking_tab = None
    for tab in tabs:
        if tab.get('type') == 'page' and 'localhost:3001' in tab.get('url', ''):
            booking_tab = tab
            break
    
    if not booking_tab:
        print("❌ 6FB Booking tab not found")
        return
    
    print(f"✅ Connected to 6FB Booking: {booking_tab['url']}")
    print(f"   Tab ID: {booking_tab['id']}")
    
    ws_url = booking_tab['webSocketDebuggerUrl']
    
    try:
        async with websockets.connect(ws_url) as websocket:
            # Enable domains
            domains = ["Runtime", "Console", "Network", "Page"]
            for i, domain in enumerate(domains):
                command = {"id": i+1, "method": f"{domain}.enable", "params": {}}
                await websocket.send(json.dumps(command))
                await websocket.recv()
            
            print("✅ Chrome DevTools domains enabled")
            print()
            
            # Refresh the page to generate network activity
            print("🔄 Refreshing page to generate network activity...")
            refresh_command = {"id": 100, "method": "Page.reload", "params": {}}
            await websocket.send(json.dumps(refresh_command))
            await websocket.recv()
            
            # Inject some console logs that simulate real debugging
            print("💉 Injecting realistic debugging scenarios...")
            
            debug_scenarios = [
                "console.log('🔍 6FB Debug: Component mounted successfully')",
                "console.warn('⚠️ 6FB Warning: Slow API response detected')",
                "console.error('❌ 6FB Error: Failed to load user preferences')",
                "console.log('📊 6FB Analytics: Page view tracked')",
                "console.log('🌐 6FB API: Making request to /api/v1/appointments')",
                "fetch('/api/v1/user/profile').catch(e => console.error('API Error:', e))",
                "console.log('✅ 6FB Success: Calendar data loaded')"
            ]
            
            for i, scenario in enumerate(debug_scenarios):
                command = {
                    "id": 200 + i,
                    "method": "Runtime.evaluate", 
                    "params": {"expression": scenario}
                }
                await websocket.send(json.dumps(command))
                await websocket.recv()
                await asyncio.sleep(0.5)  # Space out the commands
            
            print("✅ Debugging scenarios injected")
            print()
            print("🎧 Monitoring live browser activity...")
            print("   (This shows what Claude Code will capture)")
            print()
            
            # Monitor for live events
            events_captured = {
                "console_logs": [],
                "network_requests": [],
                "errors": [],
                "page_events": []
            }
            
            start_time = datetime.now()
            while (datetime.now() - start_time).total_seconds() < 15:
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    event = json.loads(message)
                    
                    method = event.get("method", "")
                    params = event.get("params", {})
                    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
                    
                    if method == "Console.messageAdded":
                        level = params.get("level", "log")
                        text = params.get("text", "")
                        
                        events_captured["console_logs"].append({
                            "timestamp": timestamp,
                            "level": level,
                            "text": text
                        })
                        
                        color_map = {
                            "error": "\033[91m",
                            "warn": "\033[93m",
                            "info": "\033[94m", 
                            "log": "\033[92m"
                        }
                        color = color_map.get(level, "\033[0m")
                        
                        print(f"📝 [{timestamp}] {color}{level.upper()}\033[0m: {text}")
                        
                        if level == "error":
                            events_captured["errors"].append({
                                "timestamp": timestamp,
                                "text": text
                            })
                    
                    elif method == "Network.requestWillBeSent":
                        url = params.get("request", {}).get("url", "")
                        method_type = params.get("request", {}).get("method", "GET")
                        
                        if "localhost" in url:  # Only show local requests
                            events_captured["network_requests"].append({
                                "timestamp": timestamp,
                                "type": "request",
                                "method": method_type,
                                "url": url
                            })
                            print(f"🌐 [{timestamp}] → {method_type} {url}")
                    
                    elif method == "Network.responseReceived":
                        response = params.get("response", {})
                        url = response.get("url", "")
                        status = response.get("status", "")
                        
                        if "localhost" in url:  # Only show local responses
                            events_captured["network_requests"].append({
                                "timestamp": timestamp,
                                "type": "response",
                                "status": status,
                                "url": url
                            })
                            
                            status_color = "\033[92m" if str(status).startswith("2") else "\033[91m"
                            print(f"🌐 [{timestamp}] ← {status_color}{status}\033[0m {url}")
                    
                    elif method in ["Page.loadEventFired", "Page.domContentEventFired"]:
                        events_captured["page_events"].append({
                            "timestamp": timestamp,
                            "event": method
                        })
                        print(f"📄 [{timestamp}] Page event: {method}")
                
                except asyncio.TimeoutError:
                    continue
                except websockets.exceptions.ConnectionClosed:
                    break
            
            # Summary
            print()
            print("📊 Live Debugging Session Summary")
            print("=" * 60)
            print(f"✅ Console logs: {len(events_captured['console_logs'])}")
            print(f"✅ Network requests: {len(events_captured['network_requests'])}")
            print(f"✅ JavaScript errors: {len(events_captured['errors'])}")
            print(f"✅ Page events: {len(events_captured['page_events'])}")
            print()
            
            # Show recent errors
            if events_captured['errors']:
                print("🚨 JavaScript Errors Detected:")
                for error in events_captured['errors'][-3:]:
                    print(f"   [{error['timestamp']}] {error['text']}")
                print()
            
            # Show network activity 
            network_summary = {}
            for req in events_captured['network_requests']:
                if req['type'] == 'response':
                    status = str(req['status'])
                    network_summary[status] = network_summary.get(status, 0) + 1
            
            if network_summary:
                print("🌐 Network Activity Summary:")
                for status, count in network_summary.items():
                    status_icon = "✅" if status.startswith("2") else "❌"
                    print(f"   {status_icon} HTTP {status}: {count} requests")
                print()
            
            print("🎉 Live debugging demonstration complete!")
            print()
            print("💡 With Browser Logs MCP, Claude Code can:")
            print("   • Automatically detect console errors")
            print("   • Monitor API request failures")
            print("   • Track page performance issues")
            print("   • Analyze network request patterns")
            print("   • Provide real-time debugging assistance")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_live_debugging())