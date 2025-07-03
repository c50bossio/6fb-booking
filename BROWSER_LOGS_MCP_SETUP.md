# Browser Logs MCP Server Setup Guide

This MCP server allows Claude Code to directly access your browser's console logs and network requests in real-time, eliminating the need to manually copy/paste logs.

## Quick Start

### 1. Install Dependencies
```bash
cd /Users/bossio/6fb-booking
pip install -r browser-logs-mcp-requirements.txt
```

### 2. Start Chrome with Remote Debugging
```bash
# Option 1: New Chrome instance with debug mode
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug-6fb

# Option 2: If you prefer to use existing profile (close Chrome first)
google-chrome --remote-debugging-port=9222

# Option 3: For testing with separate profile
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug-6fb
```

### 3. Configure Claude Code MCP Server

Add to your Claude Code MCP configuration:

**Location:** `~/.claude-code/mcp_servers.json` (or wherever your MCP config is)

```json
{
  "mcpServers": {
    "browser-logs": {
      "command": "python",
      "args": ["/Users/bossio/6fb-booking/browser-logs-mcp-server.py"],
      "env": {}
    }
  }
}
```

### 4. Test the Setup

1. **Start Chrome** with remote debugging (step 2)
2. **Open your application** in Chrome (e.g., `http://localhost:3001`)
3. **Start Claude Code** (it will automatically connect to the MCP server)
4. **Test connection** by asking Claude to run:
   ```
   connect_to_browser
   ```

## Available MCP Functions

Once connected, Claude can use these tools:

### Core Functions
- `connect_to_browser()` - Connect to Chrome DevTools Protocol
- `get_console_logs()` - Get console logs with filtering
- `get_network_requests()` - Get network requests with filtering
- `get_javascript_errors()` - Get JavaScript errors with stack traces
- `watch_logs_live()` - Watch logs in real-time

### Management Functions
- `get_browser_tabs()` - List all open browser tabs
- `switch_tab()` - Switch monitoring to different tab
- `clear_logs()` - Clear stored logs

### Example Usage

```
# Connect to browser
connect_to_browser

# Get recent console errors
get_console_logs level="error" since_minutes=5

# Get failed network requests
get_network_requests status_code=404 since_minutes=10

# Watch live for 30 seconds
watch_logs_live duration_seconds=30
```

## Troubleshooting

### Chrome Connection Issues

**Problem:** "Failed to connect to Chrome on port 9222"
**Solution:** 
1. Make sure Chrome is running with the `--remote-debugging-port=9222` flag
2. Check if port 9222 is available: `lsof -i :9222`
3. Try restarting Chrome with the debug flag

**Problem:** "No browser tabs found"
**Solution:** 
1. Open at least one tab in Chrome
2. Navigate to your application URL
3. Try connecting again

### MCP Server Issues

**Problem:** MCP server not starting
**Solution:**
1. Check Python dependencies: `pip install -r browser-logs-mcp-requirements.txt`
2. Verify file permissions: `chmod +x browser-logs-mcp-server.py`
3. Check Claude Code MCP configuration

**Problem:** "Not connected to browser" errors
**Solution:**
1. Run `connect_to_browser` first
2. Check if Chrome is still running
3. Verify the WebSocket connection is active

## Advanced Configuration

### Custom Chrome Flags
```bash
# For development with specific profile
google-chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug-6fb \
  --disable-web-security \
  --disable-features=VizDisplayCompositor \
  --no-first-run
```

### Multiple Chrome Instances
```bash
# Instance 1: Development
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-dev

# Instance 2: Testing  
google-chrome --remote-debugging-port=9223 --user-data-dir=/tmp/chrome-test
```

Then connect to specific instance:
```
connect_to_browser port=9223
```

### Security Considerations

1. **Local Only:** Remote debugging only works locally (localhost)
2. **Temporary Profile:** Use `--user-data-dir=/tmp/chrome-debug-6fb` for isolation
3. **Port Security:** Port 9222 is only accessible from localhost
4. **No Auth Required:** The debug protocol doesn't require authentication

## Integration with 6FB Booking Development

### Typical Workflow
1. Start Chrome with debugging
2. Open frontend: `http://localhost:3001`
3. Open backend API docs: `http://localhost:8000/docs`
4. Connect Claude to browser
5. Develop/debug with real-time log access

### Common Debugging Scenarios

**API Errors:**
```
get_console_logs level="error"
get_network_requests status_code=500
```

**CORS Issues:**
```
get_network_requests url_pattern="localhost:8000"
get_console_logs level="error"
```

**Performance Issues:**
```
watch_logs_live duration_seconds=60 include_network=true
```

## Files Created

- `browser-logs-mcp-server.py` - Main MCP server
- `browser-logs-mcp-requirements.txt` - Python dependencies
- `BROWSER_LOGS_MCP_SETUP.md` - This setup guide

## Next Steps

1. **Test the setup** with your 6fb-booking project
2. **Try different filtering options** to find the most useful logs
3. **Integrate into your development workflow**
4. **Consider creating shortcuts** for common debugging scenarios

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify Chrome is running with debug flags
3. Check MCP server logs in Claude Code
4. Test with a simple webpage first

---

**Happy debugging with automated browser log access!** 🚀