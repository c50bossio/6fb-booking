#!/bin/bash

# BookedBarber V2 - Claude Code Hooks Setup Script
# Configures Claude Code hooks integration with git hooks

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PROJECT_ROOT="/Users/bossio/6fb-booking"
CLAUDE_DIR="$PROJECT_ROOT/.claude"
CLAUDE_HOOKS_DIR="$CLAUDE_DIR/hooks"
GLOBAL_CLAUDE_DIR="$HOME/.claude"

echo -e "${CYAN}🪝 BookedBarber V2 - Claude Code Hooks Setup${NC}"
echo -e "${CYAN}=============================================${NC}"

# Create directories
echo -e "${BLUE}📁 Setting up directories...${NC}"
mkdir -p "$CLAUDE_DIR"
mkdir -p "$CLAUDE_HOOKS_DIR"

# Check if global Claude directory exists
if [[ ! -d "$GLOBAL_CLAUDE_DIR" ]]; then
    echo -e "${YELLOW}⚠️  Global Claude directory not found at $GLOBAL_CLAUDE_DIR${NC}"
    echo -e "${YELLOW}   Creating directory...${NC}"
    mkdir -p "$GLOBAL_CLAUDE_DIR"
fi

# Copy hooks configuration to global settings if needed
echo -e "${BLUE}🔧 Configuring Claude Code hooks...${NC}"

# Check if global settings exist
if [[ -f "$GLOBAL_CLAUDE_DIR/settings.local.json" ]]; then
    echo -e "${GREEN}✅ Found existing Claude settings${NC}"
    
    # Create backup
    cp "$GLOBAL_CLAUDE_DIR/settings.local.json" "$GLOBAL_CLAUDE_DIR/settings.local.json.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${BLUE}📋 Created backup of existing settings${NC}"
    
    # Check if hooks are already configured
    if grep -q "hooks" "$GLOBAL_CLAUDE_DIR/settings.local.json" 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Hooks already configured in global settings${NC}"
        echo -e "${YELLOW}   Consider merging configurations manually${NC}"
    else
        echo -e "${BLUE}🔄 Hooks not found in global settings${NC}"
        echo -e "${BLUE}   You may want to merge the project hooks configuration${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No global Claude settings found${NC}"
    echo -e "${BLUE}💡 Consider creating global settings with project hooks${NC}"
fi

# Set up project-specific hook configuration
echo -e "${BLUE}📝 Setting up project-specific configuration...${NC}"

# Create project settings file that references the hooks
cat > "$CLAUDE_DIR/project-settings.json" << 'EOF'
{
  "description": "BookedBarber V2 Project Settings for Claude Code",
  "project_root": "/Users/bossio/6fb-booking",
  "hooks_config": ".claude/hooks.json",
  "git_hooks_integration": true,
  "development_workflow": {
    "v2_only_enforcement": true,
    "security_scanning": true,
    "performance_monitoring": true,
    "compliance_validation": true
  },
  "test_automation": {
    "smart_test_runner": true,
    "parallel_execution": true,
    "coverage_tracking": true
  }
}
EOF

# Create environment file for hooks
cat > "$CLAUDE_DIR/.env" << 'EOF'
# BookedBarber V2 - Claude Code Hooks Environment
BOOKEDBARBER_PROJECT_ROOT=/Users/bossio/6fb-booking
CLAUDE_HOOKS_ENABLED=true
HOOK_LOG_LEVEL=INFO
CLAUDE_HOOKS_CONFIG_PATH=/Users/bossio/6fb-booking/.claude/hooks.json

# Emergency bypass (use sparingly)
# CLAUDE_BYPASS_HOOKS=true

# Development settings
DEV_MODE=true
ENABLE_PERFORMANCE_HOOKS=true
ENABLE_SECURITY_HOOKS=true
ENABLE_COMPLIANCE_HOOKS=true
EOF

# Create usage guide
cat > "$CLAUDE_DIR/USAGE_GUIDE.md" << 'EOF'
# BookedBarber V2 - Claude Code Hooks Usage Guide

## Overview
This project is configured with comprehensive Claude Code hooks that integrate with the git hooks system to provide automated validation, security scanning, and quality assurance.

## Hooks Configured

### Pre-Tool Hooks (Before Code Changes)
1. **V1 Prevention** - Blocks modifications to deprecated V1 directories
2. **Security Scanning** - Scans code for secrets and vulnerabilities

### Post-Tool Hooks (After Code Changes)
1. **API Documentation** - Validates API docs when backend changes
2. **Database Migrations** - Checks for required migrations
3. **Performance Monitoring** - Monitors frontend performance impact
4. **Integration Health** - Validates third-party service integrations
5. **Compliance Validation** - GDPR/PCI checks for sensitive data
6. **Dependency Security** - Scans package dependencies
7. **Smart Testing** - Runs relevant tests based on changes

### Stop Hooks (End of Session)
1. **Development Summary** - Provides session summary and next steps

## Usage

### Normal Development
Claude Code hooks run automatically when you use Claude Code tools. No special action required.

### Emergency Bypass
If you need to bypass hooks in an emergency:
```bash
export CLAUDE_BYPASS_HOOKS=true
# Your Claude Code session
unset CLAUDE_BYPASS_HOOKS
```

### Hook Logs
Check hook activity: `tail -f /Users/bossio/6fb-booking/.claude/hooks.log`

### Manual Hook Testing
Test individual hooks:
```bash
# Test V2-only enforcement
/Users/bossio/6fb-booking/hooks/pre-commit-v2-only

# Test security scanning
/Users/bossio/6fb-booking/hooks/pre-commit-secrets

# Test smart test runner
/Users/bossio/6fb-booking/.claude/hooks/smart-test-runner.sh
```

## Integration with Git Hooks

Claude Code hooks work alongside the git hooks system:
- **Git Hooks**: Run during git operations (commit, push)
- **Claude Code Hooks**: Run during Claude Code operations (edit, write)

Both systems use the same underlying validation scripts for consistency.

## Configuration

### Project Configuration
- Main config: `.claude/hooks.json`
- Environment: `.claude/.env`
- Project settings: `.claude/project-settings.json`

### Global Configuration
- Global settings: `~/.claude/settings.local.json`
- Add project-specific permissions as needed

## Best Practices

1. **Keep hooks enabled** - They catch issues early
2. **Review hook logs** - Understand what's being validated
3. **Use bypass sparingly** - Only for true emergencies
4. **Update configurations** - As project needs evolve
5. **Test changes** - Use smart test runner for confidence

## Troubleshooting

### Hooks Not Running
1. Check if `.claude/hooks.json` exists
2. Verify file permissions on hook scripts
3. Check environment variables in `.claude/.env`
4. Review Claude Code global settings

### Hook Failures
1. Read the error message carefully
2. Check hook logs for details
3. Fix the underlying issue rather than bypassing
4. Test the fix manually

### Performance Issues
1. Check hook timeout settings
2. Review log files for slow operations  
3. Consider excluding large files from scanning
4. Optimize hook scripts if needed

## Support

For issues with:
- **Git Hooks**: Check `/Users/bossio/6fb-booking/hooks/README.md`
- **Claude Code Hooks**: Check this guide and logs
- **Project Issues**: Review the main project documentation
EOF

# Make all scripts executable
chmod +x "$CLAUDE_HOOKS_DIR"/*.sh

# Test hook configuration
echo -e "${BLUE}🧪 Testing hook configuration...${NC}"

if [[ -f "$CLAUDE_DIR/hooks.json" ]]; then
    if python3 -m json.tool "$CLAUDE_DIR/hooks.json" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Hooks configuration is valid JSON${NC}"
    else
        echo -e "${RED}❌ Hooks configuration has JSON syntax errors${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Hooks configuration file not found${NC}"
    exit 1
fi

# Test script executability
for script in "$CLAUDE_HOOKS_DIR"/*.sh; do
    if [[ -x "$script" ]]; then
        echo -e "${GREEN}✅ $(basename "$script") is executable${NC}"
    else
        echo -e "${RED}❌ $(basename "$script") is not executable${NC}"
        chmod +x "$script"
        echo -e "${YELLOW}🔧 Fixed permissions for $(basename "$script")${NC}"
    fi
done

# Create log file
touch "$CLAUDE_DIR/hooks.log"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] SETUP: Claude Code hooks configuration completed" >> "$CLAUDE_DIR/hooks.log"

# Summary
echo -e "\n${GREEN}🎉 Claude Code Hooks Setup Complete!${NC}"
echo -e "\n${CYAN}📋 What's Been Configured:${NC}"
echo -e "  ${GREEN}✅ Project hooks configuration (.claude/hooks.json)${NC}"
echo -e "  ${GREEN}✅ Smart test runner script${NC}"
echo -e "  ${GREEN}✅ Development summary script${NC}"
echo -e "  ${GREEN}✅ Project settings and environment${NC}"
echo -e "  ${GREEN}✅ Comprehensive usage guide${NC}"
echo -e "  ${GREEN}✅ Integration with existing git hooks${NC}"

echo -e "\n${CYAN}📚 Next Steps:${NC}"
echo -e "  ${BLUE}1. Review the usage guide: ${CYAN}cat $CLAUDE_DIR/USAGE_GUIDE.md${NC}"
echo -e "  ${BLUE}2. Test the hooks: ${CYAN}Use Claude Code to edit a file${NC}"
echo -e "  ${BLUE}3. Monitor logs: ${CYAN}tail -f $CLAUDE_DIR/hooks.log${NC}"
echo -e "  ${BLUE}4. Customize settings: ${CYAN}Edit $CLAUDE_DIR/hooks.json${NC}"

echo -e "\n${YELLOW}💡 Pro Tips:${NC}"
echo -e "  ${CYAN}• Hooks run automatically during Claude Code sessions${NC}"
echo -e "  ${CYAN}• Use CLAUDE_BYPASS_HOOKS=true for emergencies only${NC}"
echo -e "  ${CYAN}• Check hook logs to understand validations${NC}"
echo -e "  ${CYAN}• Git hooks and Claude Code hooks work together${NC}"

echo -e "\n${CYAN}🚀 BookedBarber V2 is now protected by comprehensive hooks!${NC}"
exit 0