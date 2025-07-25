#!/usr/bin/env python3
"""
Calendar View Switching Debug Script
Tests the calendar view switching functionality and captures errors
"""

import json
import requests
import websocket
import time
import threading

def test_calendar_view_switching():
    """Test calendar view switching and capture any errors"""
    
    # Connect to Chrome DevTools
    tabs_url = 'http://localhost:9222/json'
    console_logs = []
    errors_found = []
    
    try:
        response = requests.get(tabs_url)
        tabs = response.json()
        
        print("=== Chrome DevTools Connection ===")
        print(f"Found {len(tabs)} tabs")
        
        # Find or create a tab for our frontend
        frontend_tab = None
        for tab in tabs:
            if 'localhost:3001' in tab.get('url', '') or 'localhost:3000' in tab.get('url', ''):
                frontend_tab = tab
                break
        
        if not frontend_tab:
            print("No frontend tab found, creating new one...")
            # Create new tab
            new_tab_url = 'http://localhost:9222/json/new'
            new_tab_response = requests.get(new_tab_url)
            if new_tab_response.status_code == 200:
                frontend_tab = new_tab_response.json()
                print(f"Created new tab: {frontend_tab['id']}")
            else:
                print("Failed to create new tab")
                return
        
        print(f"Using tab: {frontend_tab.get('title', 'Unknown')} - {frontend_tab.get('url', 'Unknown')}")
        
        # Connect to WebSocket
        ws_url = frontend_tab['webSocketDebuggerUrl']
        print(f"Connecting to: {ws_url}")
        
        # WebSocket event handlers
        def on_message(ws, message):
            try:
                data = json.loads(message)
                
                # Handle console messages
                if data.get('method') == 'Runtime.consoleAPICalled':
                    params = data.get('params', {})
                    level = params.get('level', 'log')
                    args = params.get('args', [])
                    
                    message_parts = []
                    for arg in args:
                        if isinstance(arg, dict):
                            if 'value' in arg:
                                message_parts.append(str(arg['value']))
                            elif 'description' in arg:
                                message_parts.append(str(arg['description']))
                            else:
                                message_parts.append(str(arg))
                        else:
                            message_parts.append(str(arg))
                    
                    console_message = ' '.join(message_parts)
                    console_logs.append({'level': level, 'message': console_message, 'timestamp': time.time()})
                    print(f"Console {level}: {console_message}")
                    
                    if level == 'error':
                        errors_found.append({
                            'type': 'console_error',
                            'message': console_message,
                            'timestamp': time.time()
                        })
                
                # Handle exceptions  
                elif data.get('method') == 'Runtime.exceptionThrown':
                    exception = data.get('params', {}).get('exceptionDetails', {})
                    text = exception.get('text', 'Unknown error')
                    url = exception.get('url', '')
                    line = exception.get('lineNumber', 0)
                    column = exception.get('columnNumber', 0)
                    stack_trace = exception.get('stackTrace', {})
                    
                    error_message = f"{text} at {url}:{line}:{column}"
                    console_logs.append({'level': 'error', 'message': error_message, 'timestamp': time.time()})
                    print(f"Exception: {error_message}")
                    
                    errors_found.append({
                        'type': 'exception',
                        'message': error_message,
                        'url': url,
                        'line': line,
                        'column': column,
                        'stack_trace': stack_trace,
                        'timestamp': time.time()
                    })
                
                # Handle network failures
                elif data.get('method') == 'Network.loadingFailed':
                    params = data.get('params', {})
                    url = params.get('url', '')
                    error_text = params.get('errorText', '')
                    
                    error_message = f"Network loading failed: {error_text} for {url}"
                    console_logs.append({'level': 'error', 'message': error_message, 'timestamp': time.time()})
                    print(f"Network Error: {error_message}")
                    
                    errors_found.append({
                        'type': 'network_error',
                        'message': error_message,
                        'url': url,
                        'error_text': error_text,
                        'timestamp': time.time()
                    })
                
            except Exception as e:
                print(f"Error parsing message: {e}")
        
        def on_error(ws, error):
            print(f"WebSocket error: {error}")
        
        def on_close(ws, close_status_code, close_msg):
            print("WebSocket closed")
        
        def on_open(ws):
            print("WebSocket connected")
            # Enable runtime events
            ws.send(json.dumps({'id': 1, 'method': 'Runtime.enable'}))
            # Enable console events
            ws.send(json.dumps({'id': 2, 'method': 'Console.enable'}))
            # Enable network events
            ws.send(json.dumps({'id': 3, 'method': 'Network.enable'}))
            # Navigate to calendar page
            ws.send(json.dumps({'id': 4, 'method': 'Page.navigate', 'params': {'url': 'http://localhost:3001/calendar'}}))
        
        # Create WebSocket connection
        ws = websocket.WebSocketApp(ws_url,
                                  on_open=on_open,
                                  on_message=on_message,
                                  on_error=on_error,
                                  on_close=on_close)
        
        # Run in separate thread
        ws_thread = threading.Thread(target=ws.run_forever)
        ws_thread.daemon = True
        ws_thread.start()
        
        # Wait for connection and navigation
        print("\n=== Waiting for page to load ===")
        time.sleep(8)
        
        # Check if page loaded successfully
        print("\n=== Checking page state ===")
        ws.send(json.dumps({
            'id': 10,
            'method': 'Runtime.evaluate',
            'params': {
                'expression': 'document.readyState + " - " + document.title + " - " + window.location.href'
            }
        }))
        
        time.sleep(2)
        
        # Look for calendar view switcher buttons
        print("\n=== Looking for calendar view switcher ===")
        ws.send(json.dumps({
            'id': 11,
            'method': 'Runtime.evaluate',
            'params': {
                'expression': '''
                    var buttons = document.querySelectorAll('button');
                    var viewButtons = Array.from(buttons).filter(btn => 
                        btn.textContent.toLowerCase().includes('week') || 
                        btn.textContent.toLowerCase().includes('month') || 
                        btn.textContent.toLowerCase().includes('day')
                    );
                    console.log('Found view buttons:', viewButtons.map(btn => btn.textContent));
                    viewButtons.length + " view buttons found"
                '''
            }
        }))
        
        time.sleep(2)
        
        # Test view switching
        print("\n=== Testing view switching ===")
        
        # Try to switch to monthly view
        print("1. Attempting to switch to monthly view...")
        ws.send(json.dumps({
            'id': 12,
            'method': 'Runtime.evaluate',
            'params': {
                'expression': '''
                    (function() {
                        var buttons = document.querySelectorAll('button');
                        var monthlyBtn = Array.from(buttons).find(btn => 
                            btn.textContent.toLowerCase().includes('month')
                        );
                        if (monthlyBtn) {
                            console.log('Clicking monthly view button');
                            monthlyBtn.click();
                            return "Monthly view button clicked";
                        } else {
                            console.log('Monthly view button not found');
                            return "Monthly view button not found";
                        }
                    })()
                '''
            }
        }))
        
        time.sleep(3)
        
        # Try to switch to weekly view
        print("2. Attempting to switch to weekly view...")
        ws.send(json.dumps({
            'id': 13,
            'method': 'Runtime.evaluate',
            'params': {
                'expression': '''
                    (function() {
                        var buttons = document.querySelectorAll('button');
                        var weeklyBtn = Array.from(buttons).find(btn => 
                            btn.textContent.toLowerCase().includes('week')
                        );
                        if (weeklyBtn) {
                            console.log('Clicking weekly view button');
                            weeklyBtn.click();
                            return "Weekly view button clicked";
                        } else {
                            console.log('Weekly view button not found');
                            return "Weekly view button not found";
                        }
                    })()
                '''
            }
        }))
        
        time.sleep(3)
        
        # Try to switch to daily view
        print("3. Attempting to switch to daily view...")
        ws.send(json.dumps({
            'id': 14,
            'method': 'Runtime.evaluate',
            'params': {
                'expression': '''
                    (function() {
                        var buttons = document.querySelectorAll('button');
                        var dailyBtn = Array.from(buttons).find(btn => 
                            btn.textContent.toLowerCase().includes('day')
                        );
                        if (dailyBtn) {
                            console.log('Clicking daily view button');
                            dailyBtn.click();
                            return "Daily view button clicked";
                        } else {
                            console.log('Daily view button not found');
                            return "Daily view button not found";
                        }
                    })()
                '''
            }
        }))
        
        time.sleep(3)
        
        # Check for React errors
        print("\n=== Checking for React errors ===")
        ws.send(json.dumps({
            'id': 15,
            'method': 'Runtime.evaluate',
            'params': {
                'expression': '''
                    (function() {
                        var reactErrors = window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.reactErrors || [];
                        var hasReactErrors = window.hasReactErrors || false;
                        console.log('React errors check:', reactErrors.length, hasReactErrors);
                        return {
                            reactErrors: reactErrors.length,
                            hasReactErrors: hasReactErrors
                        };
                    })()
                '''
            }
        }))
        
        time.sleep(2)
        
        # Final wait for any delayed errors
        print("\n=== Waiting for any delayed errors ===")
        time.sleep(5)
        
        # Close connection
        ws.close()
        
        # Analyze results
        print("\n" + "="*50)
        print("=== TEST RESULTS ===")
        print("="*50)
        
        print(f"\nTotal console messages: {len(console_logs)}")
        print(f"Total errors found: {len(errors_found)}")
        
        if errors_found:
            print("\n=== ERRORS FOUND ===")
            for i, error in enumerate(errors_found, 1):
                print(f"\nError {i}:")
                print(f"  Type: {error['type']}")
                print(f"  Message: {error['message']}")
                if 'url' in error:
                    print(f"  URL: {error['url']}")
                if 'line' in error:
                    print(f"  Line: {error['line']}")
                if 'column' in error:
                    print(f"  Column: {error['column']}")
        
        # Show recent console logs
        print("\n=== RECENT CONSOLE LOGS ===")
        recent_logs = console_logs[-20:] if len(console_logs) > 20 else console_logs
        for log in recent_logs:
            print(f"{log['level'].upper()}: {log['message']}")
        
        # Summary
        print("\n=== SUMMARY ===")
        if errors_found:
            print(f"❌ Found {len(errors_found)} errors during calendar view switching test")
            error_types = list(set([error['type'] for error in errors_found]))
            print(f"Error types: {', '.join(error_types)}")
        else:
            print("✅ No errors found during calendar view switching test")
        
        return errors_found
        
    except Exception as e:
        print(f"Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return []

if __name__ == "__main__":
    test_calendar_view_switching()