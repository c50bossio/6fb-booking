#!/usr/bin/env python3
"""
Browser Logs MCP Integration for Sub-Agent Automation
Connects to the browser logs MCP server to monitor real-time JavaScript errors
and automatically trigger debugger agents when issues are detected
"""

import json
import time
import asyncio
import websocket
import threading
import logging
import requests
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import queue

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('browser-logs-integration')

@dataclass
class BrowserError:
    error_type: str
    message: str
    source: str
    line_number: int
    timestamp: datetime
    stack_trace: Optional[str] = None
    url: Optional[str] = None

class BrowserLogsIntegration:
    def __init__(self, chrome_debug_port: int = 9222):
        self.chrome_debug_port = chrome_debug_port
        self.chrome_url = f"http://localhost:{chrome_debug_port}"
        self.websocket = None
        self.session_id = None
        self.running = False
        self.error_queue = queue.Queue()
        
        # Error detection patterns
        self.critical_error_patterns = [
            "ReferenceError",
            "TypeError", 
            "SyntaxError",
            "React Error",
            "Uncaught Error",
            "Cannot read property",
            "Cannot read properties",
            "is not a function",
            "is not defined"
        ]
        
        # URL patterns to monitor
        self.monitored_urls = [
            "http://localhost:3000",
            "https://staging.bookedbarber.com",
            "https://bookedbarber.com"
        ]
        
    def connect_to_chrome(self) -> bool:
        """Connect to Chrome DevTools Protocol"""
        try:
            # Get list of available tabs
            response = requests.get(f"{self.chrome_url}/json", timeout=5)
            if response.status_code != 200:
                logger.error("Chrome DevTools not available")
                return False
            
            tabs = response.json()
            if not tabs:
                logger.error("No Chrome tabs available")
                return False
            
            # Connect to the first tab
            tab = tabs[0]
            self.session_id = tab['id']
            websocket_url = tab['webSocketDebuggerUrl']
            
            # Connect to WebSocket
            self.websocket = websocket.WebSocketApp(
                websocket_url,
                on_message=self._on_message,
                on_error=self._on_error,
                on_close=self._on_close,
                on_open=self._on_open
            )
            
            logger.info(f"Connected to Chrome tab: {tab.get('title', 'Unknown')}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to Chrome: {e}")
            return False
    
    def _on_open(self, ws):
        """Handle WebSocket connection open"""
        logger.info("WebSocket connection established")
        
        # Enable Runtime domain to receive console messages
        ws.send(json.dumps({
            "id": 1,
            "method": "Runtime.enable"
        }))
        
        # Enable Log domain for additional logging
        ws.send(json.dumps({
            "id": 2,
            "method": "Log.enable"
        }))
    
    def _on_message(self, ws, message):
        """Handle WebSocket messages from Chrome"""
        try:
            data = json.loads(message)
            
            # Handle console messages
            if data.get('method') == 'Runtime.consoleAPICalled':
                self._handle_console_message(data['params'])
            
            # Handle exceptions
            elif data.get('method') == 'Runtime.exceptionThrown':
                self._handle_exception(data['params'])
            
            # Handle log entries
            elif data.get('method') == 'Log.entryAdded':
                self._handle_log_entry(data['params'])
                
        except Exception as e:
            logger.error(f"Error processing WebSocket message: {e}")
    
    def _on_error(self, ws, error):
        """Handle WebSocket errors"""
        logger.error(f"WebSocket error: {error}")
    
    def _on_close(self, ws, close_status_code, close_msg):
        """Handle WebSocket connection close"""
        logger.info("WebSocket connection closed")
    
    def _handle_console_message(self, params: Dict):
        """Handle console API calls (console.error, console.warn, etc.)"""
        level = params.get('type', 'log')
        args = params.get('args', [])
        
        if level in ['error', 'assert']:
            # Extract error information
            error_message = self._extract_message_from_args(args)
            
            if self._is_critical_error(error_message):
                browser_error = BrowserError(
                    error_type='console_error',
                    message=error_message,
                    source='console',
                    line_number=0,
                    timestamp=datetime.now()
                )
                
                self.error_queue.put(browser_error)
                logger.warning(f"Critical console error detected: {error_message}")
    
    def _handle_exception(self, params: Dict):
        """Handle JavaScript exceptions"""
        exception_details = params.get('exceptionDetails', {})
        exception = exception_details.get('exception', {})
        
        error_message = exception.get('description', 'Unknown error')
        line_number = exception_details.get('lineNumber', 0)
        column_number = exception_details.get('columnNumber', 0)
        url = exception_details.get('url', 'unknown')
        stack_trace = exception_details.get('stackTrace', {})
        
        if self._is_critical_error(error_message):
            browser_error = BrowserError(
                error_type='javascript_exception',
                message=error_message,
                source=url,
                line_number=line_number,
                timestamp=datetime.now(),
                stack_trace=json.dumps(stack_trace) if stack_trace else None,
                url=url
            )
            
            self.error_queue.put(browser_error)
            logger.error(f"JavaScript exception detected: {error_message} at {url}:{line_number}")
    
    def _handle_log_entry(self, params: Dict):
        """Handle log entries"""
        entry = params.get('entry', {})
        level = entry.get('level', 'info')
        text = entry.get('text', '')
        url = entry.get('url', '')
        line_number = entry.get('lineNumber', 0)
        
        if level == 'error' and self._is_critical_error(text):
            browser_error = BrowserError(
                error_type='log_error',
                message=text,
                source=url,
                line_number=line_number,
                timestamp=datetime.now(),
                url=url
            )
            
            self.error_queue.put(browser_error)
            logger.error(f"Log error detected: {text}")
    
    def _extract_message_from_args(self, args: List[Dict]) -> str:
        """Extract message from console arguments"""
        messages = []
        for arg in args:
            if arg.get('type') == 'string':
                messages.append(arg.get('value', ''))
            elif arg.get('type') == 'object':
                messages.append(str(arg.get('description', arg.get('value', ''))))
        
        return ' '.join(messages)
    
    def _is_critical_error(self, message: str) -> bool:
        """Check if error message matches critical patterns"""
        message_lower = message.lower()
        
        for pattern in self.critical_error_patterns:
            if pattern.lower() in message_lower:
                return True
        
        return False
    
    def _is_monitored_url(self, url: str) -> bool:
        """Check if URL should be monitored"""
        for monitored_url in self.monitored_urls:
            if url.startswith(monitored_url):
                return True
        return False
    
    def process_errors(self, callback_func):
        """Process errors from the queue and call callback function"""
        logger.info("Starting error processing")
        
        while self.running:
            try:
                # Get error from queue (with timeout)
                error = self.error_queue.get(timeout=1)
                
                # Only process errors from monitored URLs
                if error.url and not self._is_monitored_url(error.url):
                    continue
                
                # Call the callback function to trigger sub-agent
                callback_func(error)
                
                self.error_queue.task_done()
                
            except queue.Empty:
                continue
            except Exception as e:
                logger.error(f"Error processing browser error: {e}")
                time.sleep(5)
    
    def start_monitoring(self, error_callback):
        """Start monitoring browser for errors"""
        if not self.connect_to_chrome():
            logger.error("Failed to connect to Chrome - browser monitoring disabled")
            return False
        
        self.running = True
        
        # Start WebSocket connection in a separate thread
        websocket_thread = threading.Thread(
            target=self.websocket.run_forever,
            name='websocket_thread'
        )
        websocket_thread.daemon = True
        websocket_thread.start()
        
        # Start error processing in a separate thread
        error_processing_thread = threading.Thread(
            target=self.process_errors,
            args=(error_callback,),
            name='error_processing_thread'
        )
        error_processing_thread.daemon = True
        error_processing_thread.start()
        
        logger.info("Browser monitoring started successfully")
        return True
    
    def stop_monitoring(self):
        """Stop monitoring browser"""
        self.running = False
        
        if self.websocket:
            self.websocket.close()
        
        logger.info("Browser monitoring stopped")
    
    def get_status(self) -> Dict:
        """Get current monitoring status"""
        return {
            'running': self.running,
            'connected': self.websocket is not None,
            'session_id': self.session_id,
            'queue_size': self.error_queue.qsize(),
            'monitored_urls': self.monitored_urls
        }

# Integration with sub-agent automation
def browser_error_callback(browser_error: BrowserError):
    """Callback function to trigger sub-agents based on browser errors"""
    from datetime import datetime
    
    # Create trigger file for sub-agent automation
    trigger_file = f"/tmp/sub-agent-trigger-browser-error-{int(time.time())}.json"
    
    trigger_data = {
        "trigger_name": "javascript_errors",
        "agent_type": "debugger",
        "error_details": f"{browser_error.error_type}: {browser_error.message}",
        "affected_files": [browser_error.source] if browser_error.source else [],
        "timestamp": browser_error.timestamp.isoformat(),
        "priority": "high",
        "auto_execute": True,
        "source": "browser_logs_mcp",
        "additional_info": {
            "line_number": browser_error.line_number,
            "stack_trace": browser_error.stack_trace,
            "url": browser_error.url
        }
    }
    
    try:
        with open(trigger_file, 'w') as f:
            json.dump(trigger_data, f, indent=2)
        
        logger.info(f"Created sub-agent trigger for browser error: {browser_error.message}")
        
        # Trigger the automation system
        import subprocess
        subprocess.Popen([
            'python3', 
            '/Users/bossio/6fb-booking/.claude/scripts/sub-agent-automation.py',
            '--trigger-file', trigger_file
        ])
        
    except Exception as e:
        logger.error(f"Failed to create sub-agent trigger: {e}")

def main():
    """Main entry point for browser logs integration"""
    integration = BrowserLogsIntegration()
    
    try:
        if integration.start_monitoring(browser_error_callback):
            logger.info("Browser logs integration running")
            
            # Keep running and report status
            while True:
                time.sleep(60)
                status = integration.get_status()
                logger.info(f"Browser monitoring status: {status}")
        else:
            logger.error("Failed to start browser monitoring")
            
    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
    finally:
        integration.stop_monitoring()

if __name__ == "__main__":
    main()