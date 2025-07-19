#!/usr/bin/env python3
"""
Browser Logs MCP Server

This MCP server connects to Chrome DevTools Protocol to capture browser logs
and network requests in real-time, making them available to Claude Code.

Usage:
    1. Start Chrome with remote debugging: 
       google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
    2. Run this server: python browser-logs-mcp-server.py
    3. Add to Claude Code MCP servers configuration

Requirements:
    pip install websockets asyncio requests
"""

import asyncio
import json
import logging
import sys
import traceback
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Sequence
from urllib.parse import urlparse

import websockets
import requests
from mcp.server import Server
from mcp.server.models import InitializationOptions
from mcp.server.stdio import stdio_server
from mcp.types import (
    CallToolRequest,
    CallToolResult,
    ListToolsRequest,
    ListToolsResult,
    TextContent,
    Tool,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("browser-logs-mcp")

class BrowserLogsMCP:
    """MCP Server for capturing browser logs and network requests."""
    
    def __init__(self):
        self.console_logs: List[Dict[str, Any]] = []
        self.network_requests: List[Dict[str, Any]] = []
        self.javascript_errors: List[Dict[str, Any]] = []
        self.browser_ws: Optional[websockets.WebSocketServerProtocol] = None
        self.tabs: List[Dict[str, Any]] = []
        self.active_tab_id: Optional[str] = None
        self.connected = False
        self.server = Server("browser-logs-mcp")
        
        # Register MCP tools
        self._register_tools()
        
    def _register_tools(self):
        """Register all MCP tools."""
        
        @self.server.list_tools()
        async def list_tools() -> ListToolsResult:
            """List all available tools."""
            return ListToolsResult(
                tools=[
                    Tool(
                        name="connect_to_browser",
                        description="Connect to Chrome DevTools Protocol (requires Chrome with --remote-debugging-port=9222)",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "port": {
                                    "type": "integer",
                                    "description": "Chrome remote debugging port (default: 9222)",
                                    "default": 9222
                                }
                            }
                        }
                    ),
                    Tool(
                        name="get_console_logs",
                        description="Get console logs with optional filtering",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "level": {
                                    "type": "string",
                                    "description": "Filter by log level (error, warn, info, debug, log)",
                                    "enum": ["error", "warn", "info", "debug", "log"]
                                },
                                "since_minutes": {
                                    "type": "integer",
                                    "description": "Only logs from last N minutes"
                                },
                                "limit": {
                                    "type": "integer",
                                    "description": "Maximum number of logs to return",
                                    "default": 100
                                }
                            }
                        }
                    ),
                    Tool(
                        name="get_network_requests",
                        description="Get network requests with optional filtering",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "status_code": {
                                    "type": "integer",
                                    "description": "Filter by HTTP status code"
                                },
                                "url_pattern": {
                                    "type": "string",
                                    "description": "Filter URLs containing this pattern"
                                },
                                "method": {
                                    "type": "string",
                                    "description": "Filter by HTTP method (GET, POST, etc.)"
                                },
                                "since_minutes": {
                                    "type": "integer",
                                    "description": "Only requests from last N minutes"
                                },
                                "limit": {
                                    "type": "integer",
                                    "description": "Maximum number of requests to return",
                                    "default": 100
                                }
                            }
                        }
                    ),
                    Tool(
                        name="get_javascript_errors",
                        description="Get JavaScript errors with stack traces",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "since_minutes": {
                                    "type": "integer",
                                    "description": "Only errors from last N minutes"
                                },
                                "limit": {
                                    "type": "integer",
                                    "description": "Maximum number of errors to return",
                                    "default": 50
                                }
                            }
                        }
                    ),
                    Tool(
                        name="watch_logs_live",
                        description="Watch logs in real-time for specified duration",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "duration_seconds": {
                                    "type": "integer",
                                    "description": "Duration to watch logs (default: 60 seconds)",
                                    "default": 60
                                },
                                "include_console": {
                                    "type": "boolean",
                                    "description": "Include console logs",
                                    "default": True
                                },
                                "include_network": {
                                    "type": "boolean",
                                    "description": "Include network requests",
                                    "default": True
                                }
                            }
                        }
                    ),
                    Tool(
                        name="get_browser_tabs",
                        description="Get list of open browser tabs",
                        inputSchema={
                            "type": "object",
                            "properties": {}
                        }
                    ),
                    Tool(
                        name="switch_tab",
                        description="Switch to a specific browser tab for monitoring",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "tab_id": {
                                    "type": "string",
                                    "description": "Tab ID to switch to"
                                }
                            },
                            "required": ["tab_id"]
                        }
                    ),
                    Tool(
                        name="clear_logs",
                        description="Clear stored logs and start fresh",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "clear_console": {
                                    "type": "boolean",
                                    "description": "Clear console logs",
                                    "default": True
                                },
                                "clear_network": {
                                    "type": "boolean",
                                    "description": "Clear network requests",
                                    "default": True
                                },
                                "clear_errors": {
                                    "type": "boolean",
                                    "description": "Clear JavaScript errors",
                                    "default": True
                                }
                            }
                        }
                    )
                ]
            )
        
        @self.server.call_tool()
        async def call_tool(name: str, arguments: Dict[str, Any]) -> CallToolResult:
            """Handle tool calls."""
            try:
                if name == "connect_to_browser":
                    return await self._connect_to_browser(arguments.get("port", 9222))
                elif name == "get_console_logs":
                    return await self._get_console_logs(arguments)
                elif name == "get_network_requests":
                    return await self._get_network_requests(arguments)
                elif name == "get_javascript_errors":
                    return await self._get_javascript_errors(arguments)
                elif name == "watch_logs_live":
                    return await self._watch_logs_live(arguments)
                elif name == "get_browser_tabs":
                    return await self._get_browser_tabs()
                elif name == "switch_tab":
                    return await self._switch_tab(arguments["tab_id"])
                elif name == "clear_logs":
                    return await self._clear_logs(arguments)
                else:
                    return CallToolResult(
                        content=[TextContent(type="text", text=f"Unknown tool: {name}")]
                    )
            except Exception as e:
                logger.error(f"Error in tool {name}: {str(e)}")
                logger.error(traceback.format_exc())
                return CallToolResult(
                    content=[TextContent(type="text", text=f"Error: {str(e)}")]
                )
    
    async def _connect_to_browser(self, port: int = 9222) -> CallToolResult:
        """Connect to Chrome DevTools Protocol."""
        try:
            # First, get list of available tabs
            tabs_response = requests.get(f"http://localhost:{port}/json", timeout=10)
            if tabs_response.status_code != 200:
                return CallToolResult(
                    content=[TextContent(
                        type="text", 
                        text=f"Failed to connect to Chrome on port {port}. Make sure Chrome is running with --remote-debugging-port={port}"
                    )]
                )
            
            self.tabs = tabs_response.json()
            if not self.tabs:
                return CallToolResult(
                    content=[TextContent(
                        type="text", 
                        text="No browser tabs found. Open a tab in Chrome and try again."
                    )]
                )
            
            # Connect to the first available tab
            target_tab = self.tabs[0]
            self.active_tab_id = target_tab["id"]
            ws_url = target_tab["webSocketDebuggerUrl"]
            
            # Connect to WebSocket
            self.browser_ws = await websockets.connect(ws_url)
            self.connected = True
            
            # Enable domains
            await self._send_command("Runtime.enable")
            await self._send_command("Console.enable")
            await self._send_command("Network.enable")
            await self._send_command("Log.enable")
            
            # Start listening for events
            asyncio.create_task(self._listen_for_events())
            
            return CallToolResult(
                content=[TextContent(
                    type="text", 
                    text=f"Successfully connected to Chrome tab: {target_tab.get('title', 'Unknown')} ({target_tab.get('url', 'Unknown URL')})"
                )]
            )
            
        except Exception as e:
            return CallToolResult(
                content=[TextContent(
                    type="text", 
                    text=f"Failed to connect to browser: {str(e)}"
                )]
            )
    
    async def _send_command(self, method: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Send a command to the browser."""
        if not self.browser_ws:
            raise Exception("Not connected to browser")
        
        command = {
            "id": int(datetime.now().timestamp() * 1000),
            "method": method,
            "params": params or {}
        }
        
        await self.browser_ws.send(json.dumps(command))
        
        # Wait for response
        response = await self.browser_ws.recv()
        return json.loads(response)
    
    async def _listen_for_events(self):
        """Listen for browser events."""
        try:
            while self.connected and self.browser_ws:
                message = await self.browser_ws.recv()
                event = json.loads(message)
                await self._handle_browser_event(event)
        except websockets.exceptions.ConnectionClosed:
            logger.info("Browser WebSocket connection closed")
            self.connected = False
        except Exception as e:
            logger.error(f"Error listening for events: {str(e)}")
            self.connected = False
    
    async def _handle_browser_event(self, event: Dict[str, Any]):
        """Handle incoming browser events."""
        method = event.get("method", "")
        params = event.get("params", {})
        timestamp = datetime.now().isoformat()
        
        if method == "Console.messageAdded":
            log_entry = {
                "timestamp": timestamp,
                "level": params.get("level", "log"),
                "text": params.get("text", ""),
                "source": params.get("source", ""),
                "line": params.get("line"),
                "column": params.get("column"),
                "url": params.get("url"),
                "raw": params
            }
            self.console_logs.append(log_entry)
            
            # If it's an error, also add to JavaScript errors
            if params.get("level") == "error":
                self.javascript_errors.append(log_entry)
        
        elif method == "Network.requestWillBeSent":
            request_entry = {
                "timestamp": timestamp,
                "request_id": params.get("requestId"),
                "url": params.get("request", {}).get("url"),
                "method": params.get("request", {}).get("method"),
                "headers": params.get("request", {}).get("headers", {}),
                "type": "request",
                "raw": params
            }
            self.network_requests.append(request_entry)
        
        elif method == "Network.responseReceived":
            response_entry = {
                "timestamp": timestamp,
                "request_id": params.get("requestId"),
                "url": params.get("response", {}).get("url"),
                "status": params.get("response", {}).get("status"),
                "status_text": params.get("response", {}).get("statusText"),
                "headers": params.get("response", {}).get("headers", {}),
                "mime_type": params.get("response", {}).get("mimeType"),
                "type": "response",
                "raw": params
            }
            self.network_requests.append(response_entry)
        
        elif method == "Runtime.exceptionThrown":
            error_entry = {
                "timestamp": timestamp,
                "level": "error",
                "text": params.get("exceptionDetails", {}).get("text", ""),
                "stack_trace": params.get("exceptionDetails", {}).get("stackTrace", {}),
                "line": params.get("exceptionDetails", {}).get("lineNumber"),
                "column": params.get("exceptionDetails", {}).get("columnNumber"),
                "url": params.get("exceptionDetails", {}).get("url"),
                "raw": params
            }
            self.javascript_errors.append(error_entry)
    
    async def _get_console_logs(self, args: Dict[str, Any]) -> CallToolResult:
        """Get console logs with filtering."""
        if not self.connected:
            return CallToolResult(
                content=[TextContent(type="text", text="Not connected to browser. Use connect_to_browser tool first.")]
            )
        
        logs = self.console_logs.copy()
        
        # Filter by level
        if level := args.get("level"):
            logs = [log for log in logs if log.get("level") == level]
        
        # Filter by time
        if since_minutes := args.get("since_minutes"):
            cutoff_time = datetime.now() - timedelta(minutes=since_minutes)
            logs = [
                log for log in logs 
                if datetime.fromisoformat(log["timestamp"].replace("Z", "+00:00")) > cutoff_time
            ]
        
        # Limit results
        limit = args.get("limit", 100)
        logs = logs[-limit:]
        
        if not logs:
            return CallToolResult(
                content=[TextContent(type="text", text="No console logs found matching criteria.")]
            )
        
        # Format output
        output_lines = [f"Found {len(logs)} console log(s):\n"]
        for log in logs:
            output_lines.append(
                f"[{log['timestamp']}] {log['level'].upper()}: {log['text']}"
            )
            if log.get("url"):
                output_lines.append(f"  Source: {log['url']}:{log.get('line', '?')}")
            output_lines.append("")
        
        return CallToolResult(
            content=[TextContent(type="text", text="\n".join(output_lines))]
        )
    
    async def _get_network_requests(self, args: Dict[str, Any]) -> CallToolResult:
        """Get network requests with filtering."""
        if not self.connected:
            return CallToolResult(
                content=[TextContent(type="text", text="Not connected to browser. Use connect_to_browser tool first.")]
            )
        
        requests = self.network_requests.copy()
        
        # Filter by status code
        if status_code := args.get("status_code"):
            requests = [req for req in requests if req.get("status") == status_code]
        
        # Filter by URL pattern
        if url_pattern := args.get("url_pattern"):
            requests = [req for req in requests if url_pattern in req.get("url", "")]
        
        # Filter by method
        if method := args.get("method"):
            requests = [req for req in requests if req.get("method") == method.upper()]
        
        # Filter by time
        if since_minutes := args.get("since_minutes"):
            cutoff_time = datetime.now() - timedelta(minutes=since_minutes)
            requests = [
                req for req in requests 
                if datetime.fromisoformat(req["timestamp"].replace("Z", "+00:00")) > cutoff_time
            ]
        
        # Limit results
        limit = args.get("limit", 100)
        requests = requests[-limit:]
        
        if not requests:
            return CallToolResult(
                content=[TextContent(type="text", text="No network requests found matching criteria.")]
            )
        
        # Format output
        output_lines = [f"Found {len(requests)} network request(s):\n"]
        for req in requests:
            if req.get("type") == "request":
                output_lines.append(
                    f"[{req['timestamp']}] → {req.get('method', 'GET')} {req.get('url', 'Unknown URL')}"
                )
            elif req.get("type") == "response":
                output_lines.append(
                    f"[{req['timestamp']}] ← {req.get('status', '?')} {req.get('status_text', '')} {req.get('url', 'Unknown URL')}"
                )
        
        return CallToolResult(
            content=[TextContent(type="text", text="\n".join(output_lines))]
        )
    
    async def _get_javascript_errors(self, args: Dict[str, Any]) -> CallToolResult:
        """Get JavaScript errors with stack traces."""
        if not self.connected:
            return CallToolResult(
                content=[TextContent(type="text", text="Not connected to browser. Use connect_to_browser tool first.")]
            )
        
        errors = self.javascript_errors.copy()
        
        # Filter by time
        if since_minutes := args.get("since_minutes"):
            cutoff_time = datetime.now() - timedelta(minutes=since_minutes)
            errors = [
                error for error in errors 
                if datetime.fromisoformat(error["timestamp"].replace("Z", "+00:00")) > cutoff_time
            ]
        
        # Limit results
        limit = args.get("limit", 50)
        errors = errors[-limit:]
        
        if not errors:
            return CallToolResult(
                content=[TextContent(type="text", text="No JavaScript errors found matching criteria.")]
            )
        
        # Format output
        output_lines = [f"Found {len(errors)} JavaScript error(s):\n"]
        for error in errors:
            output_lines.append(f"[{error['timestamp']}] ERROR: {error['text']}")
            if error.get("url"):
                output_lines.append(f"  Location: {error['url']}:{error.get('line', '?')}:{error.get('column', '?')}")
            if error.get("stack_trace"):
                output_lines.append("  Stack trace:")
                for frame in error["stack_trace"].get("callFrames", []):
                    output_lines.append(f"    at {frame.get('functionName', 'anonymous')} ({frame.get('url', 'unknown')}:{frame.get('lineNumber', '?')}:{frame.get('columnNumber', '?')})")
            output_lines.append("")
        
        return CallToolResult(
            content=[TextContent(type="text", text="\n".join(output_lines))]
        )
    
    async def _watch_logs_live(self, args: Dict[str, Any]) -> CallToolResult:
        """Watch logs in real-time."""
        if not self.connected:
            return CallToolResult(
                content=[TextContent(type="text", text="Not connected to browser. Use connect_to_browser tool first.")]
            )
        
        duration = args.get("duration_seconds", 60)
        include_console = args.get("include_console", True)
        include_network = args.get("include_network", True)
        
        # Clear existing logs to start fresh
        start_console_count = len(self.console_logs)
        start_network_count = len(self.network_requests)
        
        # Wait for the specified duration
        await asyncio.sleep(duration)
        
        # Collect new logs
        new_console_logs = self.console_logs[start_console_count:] if include_console else []
        new_network_requests = self.network_requests[start_network_count:] if include_network else []
        
        # Format output
        output_lines = [f"Live monitoring results for {duration} seconds:\n"]
        
        if include_console and new_console_logs:
            output_lines.append(f"Console logs ({len(new_console_logs)}):")
            for log in new_console_logs:
                output_lines.append(f"  [{log['timestamp']}] {log['level'].upper()}: {log['text']}")
            output_lines.append("")
        
        if include_network and new_network_requests:
            output_lines.append(f"Network requests ({len(new_network_requests)}):")
            for req in new_network_requests:
                if req.get("type") == "request":
                    output_lines.append(f"  [{req['timestamp']}] → {req.get('method', 'GET')} {req.get('url', 'Unknown URL')}")
                elif req.get("type") == "response":
                    output_lines.append(f"  [{req['timestamp']}] ← {req.get('status', '?')} {req.get('url', 'Unknown URL')}")
        
        if not new_console_logs and not new_network_requests:
            output_lines.append("No new logs or network activity detected.")
        
        return CallToolResult(
            content=[TextContent(type="text", text="\n".join(output_lines))]
        )
    
    async def _get_browser_tabs(self) -> CallToolResult:
        """Get list of browser tabs."""
        if not self.tabs:
            return CallToolResult(
                content=[TextContent(type="text", text="No tabs available. Connect to browser first.")]
            )
        
        output_lines = [f"Found {len(self.tabs)} browser tab(s):\n"]
        for tab in self.tabs:
            active_marker = " (ACTIVE)" if tab.get("id") == self.active_tab_id else ""
            output_lines.append(f"  ID: {tab.get('id', 'Unknown')}{active_marker}")
            output_lines.append(f"  Title: {tab.get('title', 'Unknown')}")
            output_lines.append(f"  URL: {tab.get('url', 'Unknown')}")
            output_lines.append("")
        
        return CallToolResult(
            content=[TextContent(type="text", text="\n".join(output_lines))]
        )
    
    async def _switch_tab(self, tab_id: str) -> CallToolResult:
        """Switch to a different browser tab."""
        # Find the tab
        target_tab = None
        for tab in self.tabs:
            if tab.get("id") == tab_id:
                target_tab = tab
                break
        
        if not target_tab:
            return CallToolResult(
                content=[TextContent(type="text", text=f"Tab with ID {tab_id} not found.")]
            )
        
        try:
            # Close existing connection
            if self.browser_ws:
                await self.browser_ws.close()
            
            # Connect to new tab
            ws_url = target_tab["webSocketDebuggerUrl"]
            self.browser_ws = await websockets.connect(ws_url)
            self.active_tab_id = tab_id
            
            # Re-enable domains
            await self._send_command("Runtime.enable")
            await self._send_command("Console.enable")
            await self._send_command("Network.enable")
            await self._send_command("Log.enable")
            
            # Restart event listener
            asyncio.create_task(self._listen_for_events())
            
            return CallToolResult(
                content=[TextContent(
                    type="text", 
                    text=f"Switched to tab: {target_tab.get('title', 'Unknown')} ({target_tab.get('url', 'Unknown URL')})"
                )]
            )
            
        except Exception as e:
            return CallToolResult(
                content=[TextContent(type="text", text=f"Failed to switch tab: {str(e)}")]
            )
    
    async def _clear_logs(self, args: Dict[str, Any]) -> CallToolResult:
        """Clear stored logs."""
        cleared = []
        
        if args.get("clear_console", True):
            count = len(self.console_logs)
            self.console_logs.clear()
            cleared.append(f"console logs ({count})")
        
        if args.get("clear_network", True):
            count = len(self.network_requests)
            self.network_requests.clear()
            cleared.append(f"network requests ({count})")
        
        if args.get("clear_errors", True):
            count = len(self.javascript_errors)
            self.javascript_errors.clear()
            cleared.append(f"JavaScript errors ({count})")
        
        return CallToolResult(
            content=[TextContent(type="text", text=f"Cleared: {', '.join(cleared)}")]
        )
    
    async def run(self):
        """Run the MCP server."""
        async with stdio_server() as (read_stream, write_stream):
            await self.server.run(
                read_stream,
                write_stream,
                InitializationOptions(
                    server_name="browser-logs-mcp",
                    server_version="1.0.0",
                    capabilities=self.server.get_capabilities(),
                ),
            )

async def main():
    """Main entry point."""
    mcp_server = BrowserLogsMCP()
    await mcp_server.run()

if __name__ == "__main__":
    asyncio.run(main())