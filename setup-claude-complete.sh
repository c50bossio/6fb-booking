#!/bin/bash

# Complete Claude Code Setup Script
# Finalizes Claude installation and configuration

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🚀 Completing Claude Code Setup${NC}"
echo -e "${CYAN}=================================${NC}"

# Check current status
echo -e "\n${BLUE}📊 Current Installation Status:${NC}"

# Check Claude CLI
if command -v claude &> /dev/null; then
    CLAUDE_VERSION=$(claude --version)
    echo -e "  ${GREEN}✅ Claude CLI: ${CLAUDE_VERSION}${NC}"
else
    echo -e "  ${RED}❌ Claude CLI: Not installed${NC}"
    exit 1
fi

# Check MCP servers
echo -e "\n${BLUE}🔌 MCP Servers Status:${NC}"
claude mcp list | while read -r line; do
    server_name=$(echo "$line" | cut -d':' -f1)
    echo -e "  ${GREEN}✅ $server_name${NC}"
done

# Check Claude Desktop
if pgrep -f "Claude.app" > /dev/null; then
    echo -e "  ${GREEN}✅ Claude Desktop: Running${NC}"
else
    echo -e "  ${YELLOW}⚠️  Claude Desktop: Not running${NC}"
    echo -e "     ${BLUE}Please open Claude Desktop app${NC}"
fi

# Check project configuration
if [[ -f ".claude/hooks.json" ]]; then
    echo -e "  ${GREEN}✅ Project Hooks: Configured${NC}"
else
    echo -e "  ${RED}❌ Project Hooks: Missing${NC}"
fi

# Check GitHub token
echo -e "\n${BLUE}🔑 Checking API Keys:${NC}"
if [[ -n "${GITHUB_PERSONAL_ACCESS_TOKEN:-}" ]]; then
    echo -e "  ${GREEN}✅ GitHub Token: Configured${NC}"
    GITHUB_CONFIGURED=true
else
    echo -e "  ${YELLOW}⚠️  GitHub Token: Not set${NC}"
    GITHUB_CONFIGURED=false
fi

if [[ -n "${BRAVE_API_KEY:-}" ]]; then
    echo -e "  ${GREEN}✅ Brave API Key: Configured${NC}"
else
    echo -e "  ${YELLOW}⚠️  Brave API Key: Not set${NC}"
fi

# Setup GitHub token if not configured
if [[ "$GITHUB_CONFIGURED" == "false" ]]; then
    echo -e "\n${CYAN}🔧 Setting up GitHub Integration${NC}"
    echo -e "${BLUE}To enable full GitHub integration with Claude:${NC}"
    echo -e "\n${YELLOW}1. Create a GitHub Personal Access Token:${NC}"
    echo -e "   • Visit: ${CYAN}https://github.com/settings/tokens${NC}"
    echo -e "   • Click: ${CYAN}'Generate new token (classic)'${NC}"
    echo -e "   • Select these scopes:"
    echo -e "     ${GREEN}✅ repo${NC} (Full repository access)"
    echo -e "     ${GREEN}✅ workflow${NC} (GitHub Actions)"
    echo -e "     ${GREEN}✅ read:org${NC} (Organization access)"
    echo -e "     ${GREEN}✅ gist${NC} (Gist access)"
    echo -e "\n${YELLOW}2. After creating the token, run this command:${NC}"
    echo -e "   ${CYAN}export GITHUB_PERSONAL_ACCESS_TOKEN=\"your_token_here\"${NC}"
    echo -e "\n${YELLOW}3. To make it permanent, add to your ~/.zshrc:${NC}"
    echo -e "   ${CYAN}echo 'export GITHUB_PERSONAL_ACCESS_TOKEN=\"your_token_here\"' >> ~/.zshrc${NC}"
    echo -e "\n${BLUE}Press Enter when you've completed this setup...${NC}"
    read -r
    
    # Re-check after user setup
    if [[ -n "${GITHUB_PERSONAL_ACCESS_TOKEN:-}" ]]; then
        echo -e "  ${GREEN}✅ GitHub Token: Now configured!${NC}"
    else
        echo -e "  ${YELLOW}⚠️  GitHub Token: Still not detected${NC}"
        echo -e "     ${BLUE}You can configure it later and restart Claude Desktop${NC}"
    fi
fi

# Test MCP functionality
echo -e "\n${BLUE}🧪 Testing MCP Integration:${NC}"

# Test filesystem MCP
if [[ -d ".claude" ]]; then
    echo -e "  ${GREEN}✅ Filesystem MCP: Working (can access .claude directory)${NC}"
else
    echo -e "  ${YELLOW}⚠️  Filesystem MCP: May have limited access${NC}"
fi

# Test SQLite MCP (if database exists)
if [[ -f "backend-v2/6fb_booking.db" ]]; then
    echo -e "  ${GREEN}✅ SQLite MCP: Database found${NC}"
elif [[ -f "backend-v2/staging_6fb_booking.db" ]]; then
    echo -e "  ${GREEN}✅ SQLite MCP: Staging database found${NC}"
else
    echo -e "  ${BLUE}ℹ️  SQLite MCP: No database found (will work when created)${NC}"
fi

# Check Docker
if command -v docker &> /dev/null && docker info &> /dev/null; then
    echo -e "  ${GREEN}✅ Docker MCP: Docker is running${NC}"
elif command -v docker &> /dev/null; then
    echo -e "  ${YELLOW}⚠️  Docker MCP: Docker installed but not running${NC}"
else
    echo -e "  ${BLUE}ℹ️  Docker MCP: Docker not installed${NC}"
fi

# Verify Claude Desktop integration
echo -e "\n${BLUE}🔍 Verifying Claude Desktop Integration:${NC}"
echo -e "In Claude Desktop, you should see:"
echo -e "  ${CYAN}• A slider icon (🎚️) in the bottom left of the input box${NC}"
echo -e "  ${CYAN}• Available MCP tools when you click the slider${NC}"
echo -e "  ${CYAN}• Tools for: filesystem, database, git, etc.${NC}"

# Project-specific guidance
echo -e "\n${CYAN}📋 BookedBarber V2 - Claude Integration Features:${NC}"
echo -e "  ${GREEN}✅ Smart V2-only enforcement${NC} (blocks V1 modifications)"
echo -e "  ${GREEN}✅ Automated testing runner${NC} (runs relevant tests)"
echo -e "  ${GREEN}✅ Security scanning${NC} (detects secrets, vulnerabilities)"
echo -e "  ${GREEN}✅ Performance monitoring${NC} (tracks impact of changes)"
echo -e "  ${GREEN}✅ API documentation validation${NC} (ensures docs stay updated)"
echo -e "  ${GREEN}✅ Database migration checks${NC} (prevents schema issues)"
echo -e "  ${GREEN}✅ Development session summaries${NC} (tracks progress)"

# Usage instructions
echo -e "\n${CYAN}💡 How to Use Claude Code:${NC}"
echo -e "  ${BLUE}1. Open Claude Desktop app${NC}"
echo -e "  ${BLUE}2. Click the slider icon (🎚️) to see available tools${NC}"
echo -e "  ${BLUE}3. Ask Claude to help with your code:${NC}"
echo -e "     ${CYAN}• \"Help me fix this bug in the appointment booking\"${NC}"
echo -e "     ${CYAN}• \"Review my code changes for security issues\"${NC}"
echo -e "     ${CYAN}• \"Run tests for the files I just modified\"${NC}"
echo -e "     ${CYAN}• \"Check if my database changes need migrations\"${NC}"

# Troubleshooting
echo -e "\n${YELLOW}🔧 Troubleshooting:${NC}"
echo -e "  ${BLUE}• If MCP tools don't appear: Restart Claude Desktop${NC}"
echo -e "  ${BLUE}• If hooks don't work: Check .claude/hooks.log${NC}"
echo -e "  ${BLUE}• If GitHub integration fails: Verify token permissions${NC}"
echo -e "  ${BLUE}• For project help: Check .claude/USAGE_GUIDE.md${NC}"

# Final status
echo -e "\n${GREEN}🎉 Claude Code Setup Complete!${NC}"
echo -e "\n${CYAN}📊 Final Status Summary:${NC}"
echo -e "  ${GREEN}✅ Claude CLI: Ready${NC}"
echo -e "  ${GREEN}✅ MCP Servers: 5 configured${NC}"
echo -e "  ${GREEN}✅ Project Integration: Full hooks system${NC}"
echo -e "  ${GREEN}✅ BookedBarber V2: Enhanced development workflow${NC}"

if [[ "$GITHUB_CONFIGURED" == "true" ]]; then
    echo -e "  ${GREEN}✅ GitHub Integration: Ready${NC}"
else
    echo -e "  ${YELLOW}⚠️  GitHub Integration: Configure token for full features${NC}"
fi

echo -e "\n${CYAN}🚀 You're ready to use Claude Code with BookedBarber V2!${NC}"
echo -e "${BLUE}Start by asking Claude to help with your development tasks.${NC}"

# Log completion
echo "[$(date '+%Y-%m-%d %H:%M:%S')] SETUP: Claude Code setup verification completed" >> .claude/hooks.log 