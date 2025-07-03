#!/bin/bash

# Browser Logs MCP Setup Script
# This script sets up the Browser Logs MCP server for development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="/Users/bossio/6fb-booking"
CLAUDE_CONFIG="$HOME/.config/claude-desktop/config.json"

echo -e "${BLUE}🚀 Setting up Browser Logs MCP Server...${NC}"
echo "=================================================="

# Step 1: Check if we're in the right directory
if [ ! -f "$PROJECT_ROOT/browser-logs-mcp-server.py" ]; then
    echo -e "${RED}❌ Error: Browser Logs MCP server not found at $PROJECT_ROOT${NC}"
    echo "   Make sure you're running this from the project root."
    exit 1
fi

echo -e "${GREEN}✅ Found Browser Logs MCP server${NC}"

# Step 2: Install Python dependencies
echo -e "\n${BLUE}📦 Installing Python dependencies...${NC}"
cd "$PROJECT_ROOT"

if [ -f "browser-logs-mcp-requirements.txt" ]; then
    pip install -r browser-logs-mcp-requirements.txt
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${RED}❌ Error: browser-logs-mcp-requirements.txt not found${NC}"
    exit 1
fi

# Step 3: Test MCP server syntax
echo -e "\n${BLUE}🔍 Testing MCP server syntax...${NC}"
python -m py_compile browser-logs-mcp-server.py
echo -e "${GREEN}✅ MCP server syntax valid${NC}"

# Step 4: Check/create Claude Desktop config directory
echo -e "\n${BLUE}📁 Checking Claude Desktop configuration...${NC}"
CLAUDE_CONFIG_DIR="$(dirname "$CLAUDE_CONFIG")"

if [ ! -d "$CLAUDE_CONFIG_DIR" ]; then
    echo -e "${YELLOW}⚠️  Creating Claude Desktop config directory...${NC}"
    mkdir -p "$CLAUDE_CONFIG_DIR"
fi

# Step 5: Update Claude Desktop configuration
echo -e "\n${BLUE}⚙️  Updating Claude Desktop configuration...${NC}"

if [ -f "$CLAUDE_CONFIG" ]; then
    # Backup existing config
    cp "$CLAUDE_CONFIG" "$CLAUDE_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${GREEN}✅ Backed up existing configuration${NC}"
    
    # Check if browser-logs already exists
    if grep -q '"browser-logs"' "$CLAUDE_CONFIG"; then
        echo -e "${YELLOW}⚠️  Browser Logs MCP already configured${NC}"
    else
        echo -e "${BLUE}➕ Adding Browser Logs MCP to configuration...${NC}"
        
        # Create updated config with browser-logs added
        python3 << EOF
import json

# Read existing config
with open('$CLAUDE_CONFIG', 'r') as f:
    config = json.load(f)

# Ensure mcpServers exists
if 'mcpServers' not in config:
    config['mcpServers'] = {}

# Add browser-logs MCP server
config['mcpServers']['browser-logs'] = {
    "command": "python",
    "args": ["$PROJECT_ROOT/browser-logs-mcp-server.py"],
    "env": {}
}

# Write updated config
with open('$CLAUDE_CONFIG', 'w') as f:
    json.dump(config, f, indent=2)

print("Browser Logs MCP added to configuration")
EOF
        echo -e "${GREEN}✅ Configuration updated${NC}"
    fi
else
    # Create new config
    echo -e "${BLUE}📝 Creating new Claude Desktop configuration...${NC}"
    cat > "$CLAUDE_CONFIG" << 'EOF'
{
  "mcpServers": {
    "browser-logs": {
      "command": "python",
      "args": ["/Users/bossio/6fb-booking/browser-logs-mcp-server.py"],
      "env": {}
    }
  }
}
EOF
    echo -e "${GREEN}✅ Configuration created${NC}"
fi

# Step 6: Test the MCP server
echo -e "\n${BLUE}🧪 Testing MCP server...${NC}"
cd "$PROJECT_ROOT"
python test-browser-logs-mcp.py

# Step 7: Create Chrome debug script
echo -e "\n${BLUE}🌐 Creating Chrome debug script...${NC}"
cat > "$PROJECT_ROOT/scripts/start-chrome-debug.sh" << 'EOF'
#!/bin/bash

# Start Chrome with remote debugging for Browser Logs MCP

CHROME_DEBUG_PORT=9222
CHROME_USER_DATA="/tmp/chrome-debug-6fb"

echo "🌐 Starting Chrome with remote debugging..."
echo "Port: $CHROME_DEBUG_PORT"
echo "User data: $CHROME_USER_DATA"

# Check if Chrome is already running on debug port
if lsof -Pi :$CHROME_DEBUG_PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Chrome is already running on port $CHROME_DEBUG_PORT"
    echo "   Kill existing Chrome process or use a different port"
    exit 1
fi

# Start Chrome with debug flags
google-chrome \
  --remote-debugging-port=$CHROME_DEBUG_PORT \
  --user-data-dir="$CHROME_USER_DATA" \
  --disable-web-security \
  --disable-features=VizDisplayCompositor \
  --no-first-run \
  --no-default-browser-check \
  > /dev/null 2>&1 &

CHROME_PID=$!

echo "✅ Chrome started with PID: $CHROME_PID"
echo "📡 Remote debugging available at: http://localhost:$CHROME_DEBUG_PORT"
echo ""
echo "🔍 To test the connection:"
echo "   curl http://localhost:$CHROME_DEBUG_PORT/json"
echo ""
echo "💡 In Claude Code, use: connect_to_browser"
echo ""
echo "🛑 To stop Chrome debug mode:"
echo "   kill $CHROME_PID"
EOF

chmod +x "$PROJECT_ROOT/scripts/start-chrome-debug.sh"
echo -e "${GREEN}✅ Chrome debug script created${NC}"

# Step 8: Final instructions
echo -e "\n${GREEN}🎉 Browser Logs MCP Setup Complete!${NC}"
echo "=================================================="
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Restart Claude Desktop to load the new MCP server"
echo "2. Start Chrome with debugging:"
echo -e "   ${YELLOW}./scripts/start-chrome-debug.sh${NC}"
echo "3. In Claude Code, test the connection:"
echo -e "   ${YELLOW}connect_to_browser${NC}"
echo ""
echo -e "${BLUE}Common Usage:${NC}"
echo "• Get console errors: get_console_logs level=\"error\""
echo "• Monitor network: get_network_requests since_minutes=5"
echo "• Live debugging: watch_logs_live duration_seconds=30"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "• Setup guide: BROWSER_LOGS_MCP_SETUP.md"
echo "• MCP documentation: MCP_SETUP_GUIDE.md"
echo "• Project guide: CLAUDE.md (Browser Debugging section)"
echo ""
echo -e "${GREEN}Happy debugging! 🐛→✨${NC}"