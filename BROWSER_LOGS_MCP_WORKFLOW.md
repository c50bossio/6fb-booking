# 🔍 Browser Logs MCP Workflow Guide

**Mandatory debugging protocol for all frontend development in 6FB Booking**

This document provides specific commands and scenarios for using the Browser Logs MCP server during development and debugging. The browser logs MCP is **REQUIRED** for all frontend debugging tasks.

---

## 🚨 **MANDATORY USAGE PROTOCOL**

### When Browser Logs MCP is REQUIRED:
- ❗ **Frontend JavaScript errors** (React, Next.js issues)
- ❗ **API failures** (404, 500, timeout errors)
- ❗ **CORS issues** (cross-origin problems)
- ❗ **Authentication failures** (login/JWT issues)
- ❗ **Performance problems** (slow loading, network delays)
- ❗ **Payment integration issues** (Stripe errors)
- ❗ **Real-time features** (WebSocket connections)
- ❗ **Mobile responsiveness issues**

### NEVER Debug Frontend Without:
1. **Browser logs MCP connection active**
2. **Real-time monitoring during testing**
3. **Console error verification**
4. **Network request analysis**

---

## 🚀 **QUICK START WORKFLOW**

### Step 1: Setup (One-time per session)
```bash
# Start Chrome with debugging
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug-6fb

# Verify Chrome debugging is active
lsof -i :9222
```

### Step 2: Connect (Required for every debugging session)
```bash
# In Claude Code
connect_to_browser
```

### Step 3: Open Application
Navigate to your development server:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000/docs`
- Staging: `https://staging.bookedbarber.com`

### Step 4: Begin Development/Debugging
Start real-time monitoring:
```bash
watch_logs_live duration_seconds=60 include_network=true
```

---

## 📋 **SCENARIO-SPECIFIC WORKFLOWS**

### 🔧 **Scenario 1: New Feature Development**

**Workflow:**
```bash
# 1. Connect and start monitoring
connect_to_browser
watch_logs_live duration_seconds=300 include_network=true

# 2. Develop feature (keep monitoring active)

# 3. After implementation, check for issues
get_console_logs level="error" since_minutes=5
get_network_requests since_minutes=10

# 4. Test specific functionality
get_javascript_errors since_minutes=5

# 5. Clear logs for next test
clear_logs
```

**Success Criteria:**
- ✅ No console errors during feature usage
- ✅ All network requests return 200-299 status
- ✅ No performance warnings
- ✅ All assets load successfully

### 🐛 **Scenario 2: Bug Investigation**

**Workflow:**
```bash
# 1. Connect and reproduce bug
connect_to_browser

# 2. Start live monitoring
watch_logs_live duration_seconds=120

# 3. Reproduce the bug (keep monitoring active)

# 4. Analyze errors immediately after reproduction
get_console_logs level="error" since_minutes=2
get_javascript_errors since_minutes=2
get_network_requests status_code=400,401,404,500 since_minutes=2

# 5. Get detailed network analysis
get_network_requests since_minutes=2
```

**Investigation Checklist:**
- [ ] Console errors captured with stack traces
- [ ] Network requests analyzed for failures
- [ ] JavaScript errors have source locations
- [ ] Performance bottlenecks identified

### 🌐 **Scenario 3: API Integration Testing**

**Workflow:**
```bash
# 1. Connect and monitor API calls
connect_to_browser
watch_logs_live duration_seconds=60 include_network=true

# 2. Test API endpoints through frontend
# (perform actions that trigger API calls)

# 3. Analyze API performance
get_network_requests url_pattern="localhost:8000" since_minutes=5
get_network_requests status_code=200,201 since_minutes=5

# 4. Check for API errors
get_network_requests status_code=400,401,404,500 since_minutes=5
get_console_logs level="error" since_minutes=5
```

**API Testing Checklist:**
- [ ] All API calls return expected status codes
- [ ] Request/response payloads are correct
- [ ] API response times are acceptable (<500ms)
- [ ] No authentication failures
- [ ] CORS headers are correct

### 🔒 **Scenario 4: Authentication/Authorization Issues**

**Workflow:**
```bash
# 1. Connect and clear previous logs
connect_to_browser
clear_logs

# 2. Start monitoring before login attempt
watch_logs_live duration_seconds=90

# 3. Attempt authentication flow

# 4. Analyze auth-related requests
get_network_requests url_pattern="auth" since_minutes=3
get_network_requests url_pattern="login" since_minutes=3
get_network_requests status_code=401,403 since_minutes=3

# 5. Check for JWT token issues
get_console_logs level="warn,error" since_minutes=3
```

**Auth Testing Checklist:**
- [ ] Login requests succeed (200/201)
- [ ] JWT tokens are properly stored
- [ ] Protected endpoints include auth headers
- [ ] Token refresh works correctly
- [ ] Logout clears authentication state

### ⚡ **Scenario 5: Performance Optimization**

**Workflow:**
```bash
# 1. Connect and start comprehensive monitoring
connect_to_browser
watch_logs_live duration_seconds=180 include_network=true

# 2. Navigate through application features

# 3. Analyze performance metrics
get_network_requests since_minutes=5
get_console_logs level="warn" since_minutes=5

# 4. Focus on slow requests
get_network_requests since_minutes=5 | grep "slow"
```

**Performance Analysis Checklist:**
- [ ] Page load times <2 seconds
- [ ] API response times <500ms
- [ ] No memory leaks detected
- [ ] Bundle sizes are reasonable
- [ ] Images are properly optimized

### 💳 **Scenario 6: Payment/Stripe Integration**

**Workflow:**
```bash
# 1. Connect and prepare for payment testing
connect_to_browser
watch_logs_live duration_seconds=120 include_network=true

# 2. Test payment flow (use Stripe test cards)

# 3. Analyze Stripe-related requests
get_network_requests url_pattern="stripe" since_minutes=5
get_network_requests url_pattern="payment" since_minutes=5

# 4. Check for payment errors
get_console_logs level="error" since_minutes=5
get_javascript_errors since_minutes=5
```

**Payment Testing Checklist:**
- [ ] Stripe elements load correctly
- [ ] Payment intents are created
- [ ] Webhooks are processed
- [ ] Error handling displays user-friendly messages
- [ ] Payment confirmations work correctly

### 📱 **Scenario 7: Mobile Responsiveness Testing**

**Workflow:**
```bash
# 1. Connect and set mobile user agent
connect_to_browser

# 2. Start monitoring for mobile-specific issues
watch_logs_live duration_seconds=90

# 3. Test mobile viewport interactions
# (resize browser, test touch interactions)

# 4. Check for mobile-specific errors
get_console_logs level="warn,error" since_minutes=3
get_javascript_errors since_minutes=3
```

**Mobile Testing Checklist:**
- [ ] Touch interactions work correctly
- [ ] Viewport meta tag is correct
- [ ] Text is readable without zoom
- [ ] Buttons are appropriately sized
- [ ] No horizontal scrolling

### 🔄 **Scenario 8: Real-time Features (WebSocket/SSE)**

**Workflow:**
```bash
# 1. Connect and monitor WebSocket connections
connect_to_browser
watch_logs_live duration_seconds=120 include_network=true

# 2. Test real-time features (calendar updates, notifications)

# 3. Analyze WebSocket connections
get_network_requests since_minutes=5 | grep "websocket"
get_console_logs level="info,warn,error" since_minutes=5

# 4. Test connection recovery
# (simulate network interruption)
```

**Real-time Testing Checklist:**
- [ ] WebSocket connections establish successfully
- [ ] Real-time updates are received
- [ ] Connection recovery works after interruption
- [ ] No memory leaks from event listeners
- [ ] Proper connection cleanup on component unmount

---

## 🛠️ **COMMAND REFERENCE**

### Connection Commands:
```bash
# Basic connection
connect_to_browser

# Connect to specific port (if running multiple Chrome instances)
connect_to_browser port=9223

# Check connection status
get_browser_tabs
```

### Monitoring Commands:
```bash
# Real-time monitoring (recommended duration: 30-300 seconds)
watch_logs_live duration_seconds=60
watch_logs_live duration_seconds=120 include_network=true

# Get recent console logs
get_console_logs since_minutes=5
get_console_logs level="error" since_minutes=10
get_console_logs level="warn,error" since_minutes=15

# Get network requests
get_network_requests since_minutes=5
get_network_requests status_code=404,500 since_minutes=10
get_network_requests url_pattern="api/v1" since_minutes=5

# Get JavaScript errors with stack traces
get_javascript_errors since_minutes=10
get_javascript_errors since_minutes=15
```

### Filtering Commands:
```bash
# Filter by log level
get_console_logs level="error"
get_console_logs level="warn"
get_console_logs level="info"
get_console_logs level="debug"

# Filter by time range
get_console_logs since_minutes=1
get_console_logs since_minutes=5
get_console_logs since_minutes=15
get_console_logs since_minutes=30

# Filter by HTTP status
get_network_requests status_code=200,201
get_network_requests status_code=400,401,403,404
get_network_requests status_code=500,502,503,504

# Filter by URL pattern
get_network_requests url_pattern="localhost:8000"
get_network_requests url_pattern="api/v1/auth"
get_network_requests url_pattern="stripe.com"
```

### Management Commands:
```bash
# List available tabs
get_browser_tabs

# Switch to specific tab
switch_tab tab_id="E8B8B8B8B8B8B8B8"

# Clear stored logs
clear_logs

# Check MCP server status
# (this would be handled automatically)
```

---

## 🎯 **COMMON DEBUGGING PATTERNS**

### Pattern 1: "Page Not Loading" Investigation
```bash
connect_to_browser
watch_logs_live duration_seconds=60
# Navigate to problematic page
get_console_logs level="error" since_minutes=2
get_network_requests since_minutes=2
```

### Pattern 2: "Form Submission Failing" Investigation
```bash
connect_to_browser
clear_logs
watch_logs_live duration_seconds=30
# Submit form
get_network_requests since_minutes=1
get_console_logs level="error" since_minutes=1
```

### Pattern 3: "Authentication Not Working" Investigation
```bash
connect_to_browser
watch_logs_live duration_seconds=60
# Attempt login
get_network_requests url_pattern="auth" since_minutes=2
get_console_logs level="warn,error" since_minutes=2
```

### Pattern 4: "API Call Failing" Investigation
```bash
connect_to_browser
watch_logs_live duration_seconds=45
# Trigger API call
get_network_requests status_code=400,401,404,500 since_minutes=2
get_javascript_errors since_minutes=2
```

---

## 📊 **INTERPRETING RESULTS**

### Console Log Analysis:
- **Error Level**: Critical issues requiring immediate attention
- **Warning Level**: Potential issues that should be investigated
- **Info Level**: Informational messages for debugging context
- **Debug Level**: Detailed debugging information

### Network Request Analysis:
- **2xx Status**: Successful requests (good)
- **3xx Status**: Redirects (check if expected)
- **4xx Status**: Client errors (frontend issues)
- **5xx Status**: Server errors (backend issues)

### JavaScript Error Analysis:
- **Stack Traces**: Show exact code location of errors
- **Component Names**: Identify which React component failed
- **Error Messages**: Understand what went wrong

### Performance Metrics:
- **Load Times**: Page and resource loading performance
- **Request Duration**: API call response times
- **Resource Sizes**: Bundle and asset sizes
- **Memory Usage**: Potential memory leaks

---

## ⚠️ **TROUBLESHOOTING COMMON ISSUES**

### Issue: "Cannot connect to browser"
**Solution:**
```bash
# Check if Chrome is running with debug port
lsof -i :9222

# If not found, restart Chrome with debugging
pkill "Google Chrome"
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug-6fb
```

### Issue: "No logs appearing"
**Solution:**
```bash
# Clear logs and try again
clear_logs
connect_to_browser

# Ensure you're on the correct tab
get_browser_tabs
switch_tab tab_id="CORRECT_TAB_ID"
```

### Issue: "MCP server not responding"
**Solution:**
```bash
# Check Python dependencies
pip install -r browser-logs-mcp-requirements.txt

# Verify MCP server file exists
ls -la /Users/bossio/6fb-booking/browser-logs-mcp-server.py

# Restart Claude Code to reconnect MCP servers
```

### Issue: "Logs are overwhelming"
**Solution:**
```bash
# Use more specific filtering
get_console_logs level="error" since_minutes=1
get_network_requests status_code=404,500 since_minutes=2

# Focus on specific URL patterns
get_network_requests url_pattern="api/v1" since_minutes=3
```

---

## ✅ **SUCCESS CRITERIA FOR EACH SCENARIO**

### Feature Development:
- [ ] No console errors during feature usage
- [ ] All API calls return successful status codes
- [ ] Performance remains acceptable
- [ ] No accessibility warnings

### Bug Investigation:
- [ ] Root cause identified with stack traces
- [ ] Error reproduction confirmed
- [ ] Fix verified with clean logs
- [ ] Performance impact assessed

### API Integration:
- [ ] All endpoints respond correctly
- [ ] Request/response formats are valid
- [ ] Error handling works as expected
- [ ] Authentication flows correctly

### Performance Optimization:
- [ ] Load times meet targets (<2s pages, <500ms APIs)
- [ ] No memory leaks detected
- [ ] Bundle sizes are reasonable
- [ ] Critical resources prioritized

### Mobile Testing:
- [ ] Touch interactions work correctly
- [ ] Responsive design functions properly
- [ ] No mobile-specific JavaScript errors
- [ ] Performance acceptable on simulated slow networks

---

## 📝 **DOCUMENTATION REQUIREMENTS**

### After Each Debugging Session:
1. **Document findings** in commit messages or issue comments
2. **Share error patterns** with team for knowledge sharing
3. **Update debugging procedures** based on new insights
4. **Record performance baselines** for future comparison

### Example Documentation:
```
Debug Session: Payment Form Issue
Date: 2025-01-15
Issue: Stripe payment elements not loading

Browser Logs Analysis:
- Console Error: "Cannot read property 'elements' of undefined"
- Network Request: stripe.js failed to load (404)
- Root Cause: CDN URL incorrect in production build

Solution: Updated Stripe CDN URL in environment config
Verification: Payment flow now works, no console errors
```

---

**Remember: Browser logs MCP is not optional for frontend debugging. Every frontend issue must be investigated with live browser monitoring to ensure complete understanding and proper resolution.**