# MCP (Model Context Protocol) Setup Guide

## Overview
MCP servers have been configured using the Claude Code CLI to enhance Claude's capabilities. This guide explains the setup and how to complete the configuration.

## Installed MCP Servers (Claude Code CLI)

### 1. **Filesystem MCP** 
- **Purpose**: Enhanced file system operations
- **Access**: `/Users/bossio/6fb-booking` directory
- **Status**: ✅ Ready to use
- **Command**: `npx @modelcontextprotocol/server-filesystem /Users/bossio/6fb-booking`
- **Tools**: Read, write, create, delete, and manage files

### 2. **GitHub MCP**
- **Purpose**: Direct GitHub integration
- **Status**: ⚠️ Requires GitHub Personal Access Token
- **Command**: `npx @modelcontextprotocol/server-github`
- **Tools**: Repository management, PRs, issues, releases, etc.

### 3. **Web Search MCP**
- **Purpose**: Real-time web search capabilities
- **Status**: ⚠️ Requires Brave Search API key
- **Command**: `npx @modelcontextprotocol/server-brave-search`
- **Tools**: Web search, current information lookup

### 4. **SQLite MCP**
- **Purpose**: SQLite database operations
- **Status**: ✅ Ready to use
- **Command**: `npx @modelcontextprotocol/server-sqlite`
- **Tools**: Database queries, schema inspection, data manipulation

### 5. **Docker MCP**
- **Purpose**: Docker container management
- **Status**: ✅ Ready to use (if Docker is installed)
- **Command**: `npx @modelcontextprotocol/server-docker`
- **Tools**: Container management, image operations, logs

## Legacy MCP Servers (Claude Desktop)

### 1. **Sentry MCP** (Already configured in Claude Desktop)
- **Purpose**: Error monitoring and debugging
- **Status**: ✅ Fully configured with auth token

### 2. **Bossio Investing Machine** (Already configured in Claude Desktop)
- **Purpose**: Investment-related functionality
- **Status**: ✅ Ready to use

## Claude Code CLI Commands

The MCP servers are managed through Claude Code CLI:

```bash
# List all MCP servers
claude mcp list

# Get details about a specific server
claude mcp get <server-name>

# Remove a server
claude mcp remove <server-name>

# Add a new server
claude mcp add <name> <command> [args...]
```

## Setting Up API Keys

### GitHub Token (for GitHub MCP)

1. **Create Personal Access Token**:
   - Go to https://github.com/settings/tokens
   - Generate new token (classic) with these scopes:
     - ✅ `repo` (Full repository access)
     - ✅ `workflow` (GitHub Actions)
     - ✅ `read:org` (Organization access)
     - ✅ `gist` (Gist access)

2. **Set Environment Variable**:
   ```bash
   export GITHUB_PERSONAL_ACCESS_TOKEN="your_token_here"
   # Add to your ~/.zshrc or ~/.bashrc for persistence
   ```

### Brave Search API Key (for Web Search MCP)

1. **Get API Key**:
   - Sign up at https://brave.com/search/api/
   - Get your API key from the dashboard

2. **Set Environment Variable**:
   ```bash
   export BRAVE_API_KEY="your_api_key_here"
   # Add to your ~/.zshrc or ~/.bashrc for persistence
   ```

## Verifying Installation

After restarting Claude Desktop:

1. Look for the **slider icon** (🎚️) in the bottom left of the input box
2. Click it to see available MCP tools
3. You should see tools from:
   - Filesystem operations
   - GitHub integration (if token is configured)
   - Git commands
   - Sentry error monitoring
   - Bossio investing tools

## Available Commands

### Filesystem MCP
- `read_file` - Read file contents
- `write_file` - Write to files
- `list_directory` - List directory contents
- `create_directory` - Create new directories
- `delete_file` - Delete files
- `move_file` - Move/rename files

### GitHub MCP (when configured)
- `create_repository` - Create new repos
- `list_repositories` - List your repos
- `create_issue` - Create GitHub issues
- `create_pull_request` - Create PRs
- `search_repositories` - Search GitHub
- And many more...

### Git MCP
- `git_status` - Check repository status
- `git_log` - View commit history
- `git_diff` - See changes
- `git_branch` - Manage branches
- And standard git operations...

## Security Notes

1. **GitHub Token**: Keep your personal access token secure. Never commit it to a repository.
2. **Filesystem Access**: The filesystem MCP only has access to `/Users/bossio/6fb-booking` directory
3. **Command Execution**: Claude Desktop runs these commands with your user permissions

## Troubleshooting

### If MCP servers don't appear:
1. Ensure Claude Desktop is fully restarted
2. Check the config file for JSON syntax errors
3. Verify Node.js is accessible from terminal: `node --version`

### If specific server fails:
1. Check Claude Desktop logs
2. Ensure required environment variables are set
3. For GitHub MCP, verify token has correct permissions

## Next Steps

1. Add your GitHub Personal Access Token to enable GitHub MCP
2. Restart Claude Desktop
3. Test the new MCP capabilities
4. Consider adding more MCP servers based on your needs

---
*Last updated: 2025-06-28*