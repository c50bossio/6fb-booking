# MCP Fetch & Context7 Usage Guide

## Overview
This guide covers two powerful MCP capabilities for Claude Code:
1. **MCP Fetch Server**: Enhanced web content fetching with HTML to markdown conversion
2. **Context7 Library Documentation**: Direct access to curated code examples and documentation from popular libraries

## Context7 Library Documentation System

### Available Tools
- `mcp__context7__resolve-library-id`: Find libraries by name and get Context7-compatible IDs
- `mcp__context7__get-library-docs`: Retrieve documentation and code examples for specific libraries

### Basic Usage Pattern

#### 1. Resolve Library ID
```javascript
mcp__context7__resolve-library-id({
  libraryName: "react"
})
```

**Example Response:**
```
- Title: React
- Context7-compatible library ID: /context7/react_dev
- Description: React is a JavaScript library for building user interfaces
- Code Snippets: 2461
- Trust Score: 10
```

#### 2. Fetch Documentation
```javascript
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/react_dev",
  topic: "hooks",
  tokens: 2000
})
```

### Real-World Examples

#### Example 1: React Hooks Documentation
```javascript
// 1. Find React library
mcp__context7__resolve-library-id({
  libraryName: "react"
})

// 2. Get hooks documentation
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/react_dev",
  topic: "hooks",
  tokens: 2000
})
```

**Results:** Returns comprehensive documentation about React hooks including:
- Correct hook usage patterns
- Rules of hooks violations
- Custom hooks examples
- All available hooks in React 19.1

#### Example 2: FastAPI Dependency Injection
```javascript
// 1. Find FastAPI library
mcp__context7__resolve-library-id({
  libraryName: "fastapi"
})

// 2. Get dependency injection docs
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/tiangolo/fastapi",
  topic: "dependency injection",
  tokens: 1500
})
```

**Results:** Returns detailed examples of:
- Using `Depends()` for dependency injection
- Class-based dependencies
- Dependency chains and sub-dependencies
- WebSocket endpoints with dependencies

### Parameters Explained

#### resolve-library-id Parameters
- `libraryName` (required): Name of the library to search for
  - Examples: "react", "fastapi", "next.js", "express"

#### get-library-docs Parameters
- `context7CompatibleLibraryID` (required): The exact library ID from resolve-library-id
  - Format: `/org/project` or `/org/project/version`
  - Examples: `/context7/react_dev`, `/tiangolo/fastapi`

- `topic` (optional): Focus documentation on a specific topic
  - Examples: "hooks", "dependency injection", "routing", "authentication"

- `tokens` (optional): Maximum tokens to retrieve (default: 10000)
  - Recommended: 1500-3000 for focused topics, 5000+ for comprehensive docs

### Best Practices for Context7

#### 1. Choose High-Quality Libraries
Look for libraries with:
- **High Trust Score** (7-10): More authoritative sources
- **Many Code Snippets**: More comprehensive examples
- **Official sources**: Prefer `/context7/` or official organization IDs

#### 2. Use Specific Topics
Instead of generic requests, use focused topics:
```javascript
// Focused request
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/react_dev",
  topic: "hooks",
  tokens: 2000
})
```

#### 3. Appropriate Token Limits
- **Quick reference**: 1000-1500 tokens
- **Focused learning**: 2000-3000 tokens
- **Comprehensive study**: 5000+ tokens

### Integration with BookedBarber Development

#### Frontend Development
```javascript
// Get React hooks patterns for components
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/react_dev",
  topic: "custom hooks",
  tokens: 2500
})

// Next.js routing for booking pages
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/nextjs",
  topic: "app router",
  tokens: 2000
})
```

#### Backend Development
```javascript
// FastAPI dependency injection for services
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/tiangolo/fastapi",
  topic: "dependency injection",
  tokens: 2000
})

// SQLAlchemy relationship patterns
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/sqlalchemy/sqlalchemy",
  topic: "relationships",
  tokens: 2500
})
```

#### Payment & Stripe Integration
```javascript
// Stripe API patterns
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/stripe/stripe",
  topic: "payment intents",
  tokens: 2000
})
```

### Supported Libraries
The Context7 system supports a wide range of popular libraries including:
- **Frontend**: React, Vue, Angular, Next.js, Svelte
- **Backend**: FastAPI, Express, Django, Flask, Spring
- **Database**: PostgreSQL, MongoDB, Redis, SQLAlchemy
- **Mobile**: React Native, Flutter
- **DevOps**: Docker, Kubernetes, Terraform
- **Testing**: Jest, Pytest, Cypress, Selenium

### Development Workflow Integration

#### Pre-Implementation Research
Before implementing any BookedBarber feature:
1. **Search for relevant libraries**: Use `npm run docs:search`
2. **Get specific documentation**: Use npm scripts like `npm run docs:react`
3. **Focus on your exact use case**: Use specific topics like "payment intents", "app router"

Example workflow for appointment booking feature:
```bash
# Research FastAPI patterns
npm run docs:fastapi

# Get specific dependency injection docs
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/tiangolo/fastapi",
  topic: "dependency injection",
  tokens: 2000
})

# Research SQLAlchemy relationship patterns
npm run docs:sqlalchemy
```

#### During Development
- **Getting stuck on implementation?** → Look up specific patterns in Context7
- **Need API reference?** → Get exact documentation with targeted topics
- **Debugging authentication?** → Research security patterns for your framework

#### Code Review & Validation
- **Verify implementation patterns**: Check against official documentation
- **Security review**: Look up security best practices for your specific stack
- **Performance validation**: Research optimization patterns

### Quick Reference Commands
Your project includes pre-configured npm scripts for common lookups:

```bash
npm run docs:react      # React patterns and hooks
npm run docs:nextjs     # Next.js App Router documentation
npm run docs:fastapi    # FastAPI dependency injection
npm run docs:stripe     # Stripe payment processing
npm run docs:sqlalchemy # SQLAlchemy relationships
npm run docs:search     # Search for any library
```

### BookedBarber-Specific Resources
- **Complete examples**: See `/CONTEXT7_BOOKEDBARBER_EXAMPLES.md`
- **Quick reference**: See `backend-v2/frontend-v2/CONTEXT7_QUICK_REFERENCE.md`
- **Integration patterns**: Based on actual BookedBarber features

## Combined Context7 + Browser Logs Workflow (TESTED 2025-07-14)

### Verified Integration Success
✅ **Status**: Both MCP servers are fully operational and integrated  
✅ **Testing**: Completed end-to-end workflow verification  
✅ **Real-time debugging**: Browser Logs MCP successfully capturing console output  
✅ **Documentation access**: Context7 providing instant React hooks reference  

### Complete Development Workflow Example

#### Phase 1: Research with Context7
```javascript
// 1. Look up React hooks documentation
mcp__context7__resolve-library-id({
  libraryName: "react"
})

// 2. Get specific hooks documentation  
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/react_dev",
  topic: "hooks",
  tokens: 2000
})
```

**Results achieved**: Instant access to React 19.1 hooks reference including:
- Complete list of available hooks (useState, useEffect, useContext, etc.)
- Proper hook usage patterns and rules
- Custom hook creation guidelines
- Common anti-patterns to avoid

#### Phase 2: Implementation + Real-time Debugging
```javascript
// 3. Navigate to test page
mcp__puppeteer__puppeteer_navigate({ url: "http://localhost:3000/login" })

// 4. Monitor console during development
mcp__puppeteer__puppeteer_evaluate({
  script: "console.log('Testing browser logs integration');"
})
```

**Results achieved**: Real-time browser monitoring showing:
- Console logs: `[log] Testing browser logs integration`
- Console warnings: `[warn] This is a test warning`  
- Console errors: `[error] This is a test error for Browser Logs MCP`

#### Phase 3: Form Testing + Network Monitoring
```javascript
// 5. Test form interactions
mcp__puppeteer__puppeteer_fill({
  selector: "input[type='email']",
  value: "test@example.com"
})

// 6. Monitor network requests (planned)
// get_network_requests({ since_minutes: 5 })
```

### BookedBarber-Specific Workflow Integration

#### Frontend Development Pattern
1. **Research first**: Use Context7 to understand React/Next.js patterns
2. **Implement with monitoring**: Browser Logs for real-time feedback
3. **Test interactions**: Puppeteer for form/UI testing
4. **Debug issues**: Console logs + network request monitoring

#### Common Use Cases Verified

**React Hook Implementation:**
- Context7: Get hook usage patterns
- Browser Logs: Monitor for hook rule violations
- Puppeteer: Test hook behavior in components

**Form Development:**
- Context7: Research form handling patterns
- Browser Logs: Monitor validation errors
- Puppeteer: Test form interactions

**API Integration:**
- Context7: Look up API client patterns  
- Browser Logs: Monitor network requests
- Puppeteer: Test end-to-end flows

### Integration Benefits Demonstrated

1. **Reduced Context Switching**: No need to leave development environment
2. **Real-time Validation**: Immediate feedback on code changes
3. **Complete Debugging Context**: Console + network + visual confirmation
4. **Pattern Discovery**: Instant access to best practices

### Next Steps for Enhanced Integration

1. **Enhanced Development Hooks**: Automatic Context7 suggestions during coding
2. **Team Adoption Guidelines**: Standardized workflow documentation
3. **Automated Testing Integration**: Combine all three MCP servers for comprehensive testing

---

## MCP Fetch Server

The MCP fetch server provides enhanced web content fetching capabilities for Claude Code. It converts HTML to markdown, supports chunked reading, and offers more control than the standard WebFetch tool.

## Available Tools (After Claude Code Restart)

### `mcp__fetch__fetch`
Fetches web content and converts to markdown.

**Parameters:**
- `url` (required): URL to fetch
- `max_length` (optional): Maximum characters to return (default: 5000)
- `start_index` (optional): Start content from this character index (default: 0)
- `raw` (optional): Get raw content without markdown conversion (default: false)

## Common Development Use Cases

### 1. API Documentation Research
```
mcp__fetch__fetch url="https://docs.stripe.com/api/payment_intents" max_length=10000
```

### 2. Library Documentation
```
mcp__fetch__fetch url="https://nextjs.org/docs/app/building-your-application/routing" 
```

### 3. Chunked Reading for Large Pages
```
# First chunk
mcp__fetch__fetch url="https://example.com/large-doc" max_length=5000

# Continue reading from where we left off
mcp__fetch__fetch url="https://example.com/large-doc" start_index=5000 max_length=5000
```

### 4. Raw HTML Content
```
mcp__fetch__fetch url="https://api.example.com/schema" raw=true
```

## Integration with BookedBarber Development

### Frontend Development
- Fetch React/Next.js documentation
- Research UI component libraries
- Get Tailwind CSS examples

### Backend Development
- Fetch FastAPI documentation
- Research SQLAlchemy patterns
- Get Stripe API examples

### Marketing Integrations
- Fetch Google My Business API docs
- Research Meta Business API
- Get conversion tracking examples

## Advantages over Standard WebFetch

1. **Better HTML Conversion**: More accurate markdown conversion
2. **Chunked Reading**: Read large documents in pieces
3. **Raw Content Option**: Get original HTML when needed
4. **Configurable**: Custom user agents, proxy support
5. **Robots.txt Compliance**: Respects website policies

## Configuration Details

The fetch server is configured in `~/.config/claude-desktop/config.json`:

```json
{
  "mcpServers": {
    "fetch": {
      "command": "python",
      "args": ["-m", "mcp_server_fetch"],
      "env": {}
    }
  }
}
```

## Optional Hook Integration

While MCP fetch tools work great on-demand, you could add hooks for specific workflows:

### Documentation Sync Hook
```json
{
  "trigger": "file_changed",
  "pattern": "**/integrations/**/*.py",
  "action": "fetch_integration_docs",
  "description": "Auto-fetch API docs when working on integrations"
}
```

### Dependency Check Hook
```json
{
  "trigger": "file_changed", 
  "pattern": "package.json",
  "action": "check_npm_updates",
  "description": "Fetch latest package info on dependency changes"
}
```

## Best Practices

1. **Use Chunked Reading**: For large documentation pages
2. **Cache Results**: Store frequently accessed docs locally
3. **Respect Rate Limits**: Don't fetch too frequently
4. **Use Raw Mode**: When you need to parse HTML structure
5. **Combine with Search**: Use with grep/search tools for better research

## Troubleshooting

### Server Not Available
- Restart Claude Code to load new MCP servers
- Check configuration in `~/.config/claude-desktop/config.json`
- Verify `mcp-server-fetch` is installed: `pip show mcp-server-fetch`

### Fetch Failures
- Check URL accessibility
- Verify robots.txt compliance
- Use `--ignore-robots-txt` flag if needed
- Check for CORS or authentication requirements

## Security Notes

⚠️ **Caution**: The fetch server can access local/internal IP addresses. Use carefully in production environments and avoid fetching sensitive internal resources.