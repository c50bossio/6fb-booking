#!/bin/bash

# Start Chrome with remote debugging for Browser Logs MCP
# This script starts Chrome with the necessary flags for Claude Code integration

set -e

CHROME_DEBUG_PORT=9222
CHROME_USER_DATA="/tmp/chrome-debug-6fb"
PROJECT_ROOT="/Users/bossio/6fb-booking"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🌐 Starting Chrome with remote debugging...${NC}"
echo "Port: $CHROME_DEBUG_PORT"
echo "User data: $CHROME_USER_DATA"
echo ""

# Check if Chrome is already running on debug port
if lsof -Pi :$CHROME_DEBUG_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Chrome is already running on port $CHROME_DEBUG_PORT${NC}"
    
    # Get the PID of the process using the port
    EXISTING_PID=$(lsof -Pi :$CHROME_DEBUG_PORT -sTCP:LISTEN -t)
    echo "   Existing Chrome process PID: $EXISTING_PID"
    echo ""
    echo "Options:"
    echo "1. Kill existing Chrome process: kill $EXISTING_PID"
    echo "2. Use existing Chrome instance (it should work for debugging)"
    echo "3. Use a different port (modify this script)"
    echo ""
    
    # Test if the existing Chrome instance is accessible
    echo -e "${BLUE}🔍 Testing connection to existing Chrome instance...${NC}"
    if curl -s "http://localhost:$CHROME_DEBUG_PORT/json" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Existing Chrome instance is accessible for debugging${NC}"
        echo "📡 Remote debugging available at: http://localhost:$CHROME_DEBUG_PORT"
        echo ""
        echo -e "${BLUE}💡 You can proceed with Claude Code integration:${NC}"
        echo "   connect_to_browser"
        exit 0
    else
        echo -e "${RED}❌ Existing Chrome instance not accessible${NC}"
        echo "   You may need to restart Chrome with debug flags"
        exit 1
    fi
fi

# Create user data directory if it doesn't exist
if [ ! -d "$CHROME_USER_DATA" ]; then
    echo -e "${BLUE}📁 Creating Chrome user data directory...${NC}"
    mkdir -p "$CHROME_USER_DATA"
fi

# Find Chrome executable
CHROME_EXECUTABLE=""
if command -v google-chrome >/dev/null 2>&1; then
    CHROME_EXECUTABLE="google-chrome"
elif command -v chromium >/dev/null 2>&1; then
    CHROME_EXECUTABLE="chromium"
elif [ -f "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]; then
    CHROME_EXECUTABLE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
elif command -v chrome >/dev/null 2>&1; then
    CHROME_EXECUTABLE="chrome"
else
    echo -e "${RED}❌ Chrome not found${NC}"
    echo "Please install Google Chrome or ensure it's in your PATH"
    exit 1
fi

echo -e "${GREEN}✅ Found Chrome: $CHROME_EXECUTABLE${NC}"

# Start Chrome with debug flags
echo -e "${BLUE}🚀 Starting Chrome with debug flags...${NC}"

"$CHROME_EXECUTABLE" \
  --remote-debugging-port=$CHROME_DEBUG_PORT \
  --user-data-dir="$CHROME_USER_DATA" \
  --disable-web-security \
  --disable-features=VizDisplayCompositor \
  --no-first-run \
  --no-default-browser-check \
  --disable-background-timer-throttling \
  --disable-renderer-backgrounding \
  --disable-backgrounding-occluded-windows \
  --disable-background-networking \
  --new-window \
  > /dev/null 2>&1 &

CHROME_PID=$!

# Wait a moment for Chrome to start
sleep 3

# Test the connection
echo -e "${BLUE}🔍 Testing Chrome remote debugging connection...${NC}"
for i in {1..10}; do
    if curl -s "http://localhost:$CHROME_DEBUG_PORT/json" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Chrome started successfully with PID: $CHROME_PID${NC}"
        echo "📡 Remote debugging available at: http://localhost:$CHROME_DEBUG_PORT"
        break
    fi
    
    if [ $i -eq 10 ]; then
        echo -e "${RED}❌ Failed to connect to Chrome after 10 attempts${NC}"
        echo "Chrome may have failed to start or took too long"
        exit 1
    fi
    
    echo "   Attempt $i/10 - waiting for Chrome to be ready..."
    sleep 1
done

# Get list of open tabs
echo ""
echo -e "${BLUE}📱 Available browser tabs:${NC}"
curl -s "http://localhost:$CHROME_DEBUG_PORT/json" | python3 -c "
import json, sys
try:
    tabs = json.load(sys.stdin)
    for i, tab in enumerate(tabs, 1):
        title = tab.get('title', 'Untitled')[:50]
        url = tab.get('url', 'No URL')[:80]
        print(f'   {i}. {title}')
        print(f'      {url}')
except:
    print('   Could not parse tab information')
"

echo ""
echo -e "${GREEN}🎉 Chrome debug mode ready!${NC}"
echo ""
echo -e "${BLUE}💡 Next steps for Claude Code integration:${NC}"
echo "1. In Claude Code, run: connect_to_browser"
echo "2. Navigate to your 6fb-booking app: http://localhost:3001"
echo "3. Start debugging with Claude!"
echo ""
echo -e "${BLUE}🔧 Useful debugging commands:${NC}"
echo "• Get console logs: get_console_logs level=\"error\""
echo "• Monitor network: get_network_requests since_minutes=5"
echo "• Live debugging: watch_logs_live duration_seconds=30"
echo ""
echo -e "${BLUE}🛑 To stop Chrome debug mode:${NC}"
echo "   kill $CHROME_PID"
echo ""

# Optionally open the 6fb-booking frontend
if [ -d "$PROJECT_ROOT/backend-v2/frontend-v2" ]; then
    echo -e "${YELLOW}💡 Want to open the 6fb-booking frontend automatically? (y/n)${NC}"
    read -t 10 -n 1 -r AUTO_OPEN || AUTO_OPEN="n"
    echo
    
    if [[ $AUTO_OPEN =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}🌐 Opening 6fb-booking frontend...${NC}"
        "$CHROME_EXECUTABLE" --new-tab "http://localhost:3001" &
        sleep 1
        echo -e "${GREEN}✅ Frontend tab opened${NC}"
    fi
fi

echo -e "${GREEN}Chrome debug session active. Happy debugging! 🐛→✨${NC}"