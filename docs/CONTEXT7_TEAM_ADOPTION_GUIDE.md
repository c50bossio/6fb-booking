# Context7 Team Adoption Guide

## Overview

This guide helps team members adopt and effectively use the Context7 + Browser Logs MCP integration for accelerated development on the BookedBarber platform.

## Getting Started

### Prerequisites
- Claude Code (claude.ai/code) configured with MCP servers
- Chrome with debugging enabled (`./scripts/start-chrome-debug.sh`)
- BookedBarber development environment running

### Quick Verification
Test your setup with these commands:
```javascript
// 1. Test Context7 access
mcp__context7__resolve-library-id({ libraryName: "react" })

// 2. Test Browser Logs
mcp__puppeteer__puppeteer_navigate({ url: "http://localhost:3000" })
mcp__puppeteer__puppeteer_evaluate({ script: "console.log('MCP integration test')" })
```

## Team Workflow Standards

### 1. Research-First Development

**Before implementing ANY feature:**
```javascript
// Step 1: Research relevant documentation
mcp__context7__resolve-library-id({ libraryName: "[technology]" })
mcp__context7__get-library-docs({ 
  context7CompatibleLibraryID: "/org/project", 
  topic: "[specific-topic]" 
})
```

**Example: Implementing a new React component**
```javascript
// Research React component patterns
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/react_dev",
  topic: "component patterns",
  tokens: 2000
})

// Research Next.js routing if needed
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/nextjs", 
  topic: "app router",
  tokens: 1500
})
```

### 2. Development with Real-time Monitoring

**During implementation:**
```javascript
// Start browser monitoring
mcp__puppeteer__puppeteer_navigate({ url: "http://localhost:3000/your-feature" })

// Test your changes with live monitoring
mcp__puppeteer__puppeteer_evaluate({ 
  script: "console.log('Testing new feature');" 
})

// Monitor for errors during development
// Browser Logs MCP will automatically capture console output
```

### 3. Testing and Validation

**After implementation:**
```javascript
// Test form interactions
mcp__puppeteer__puppeteer_fill({ 
  selector: "input[type='email']", 
  value: "test@example.com" 
})

// Verify API calls work
mcp__puppeteer__puppeteer_click({ selector: "button[type='submit']" })
// Network requests will be automatically monitored
```

## Technology-Specific Guidelines

### Frontend Development (React/Next.js)

#### Hook Implementation
```javascript
// 1. Research hook patterns first
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/react_dev",
  topic: "hooks",
  tokens: 2000
})

// 2. Check for hook violations during development
// Browser Logs will capture React hook errors automatically
```

#### Component Development
```javascript
// 1. Research component patterns
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/react_dev", 
  topic: "component lifecycle",
  tokens: 1500
})

// 2. Test component rendering
mcp__puppeteer__puppeteer_screenshot({ name: "component-test" })
```

#### Form Handling
```javascript
// 1. Research form patterns
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/react_dev",
  topic: "forms and validation",
  tokens: 2000
})

// 2. Test form interactions
mcp__puppeteer__puppeteer_fill({ selector: "input", value: "test" })
mcp__puppeteer__puppeteer_click({ selector: "button[type='submit']" })
```

### Backend Development (FastAPI/Python)

#### API Endpoint Development
```javascript
// 1. Research FastAPI patterns
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/tiangolo/fastapi",
  topic: "dependency injection",
  tokens: 2000
})

// 2. Test API endpoints
mcp__puppeteer__puppeteer_evaluate({
  script: "fetch('/api/v1/your-endpoint').then(r => console.log(r.status))"
})
```

#### Database Models
```javascript
// 1. Research SQLAlchemy patterns
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/sqlalchemy/sqlalchemy",
  topic: "relationships",
  tokens: 2000
})

// 2. Verify database operations through API testing
```

### Payment Integration (Stripe)

```javascript
// 1. Research Stripe patterns
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/stripe/stripe",
  topic: "payment intents",
  tokens: 2000
})

// 2. Test payment flow with browser monitoring
mcp__puppeteer__puppeteer_navigate({ url: "http://localhost:3000/payment" })
// Monitor for Stripe-related console messages
```

## Best Practices

### 1. Documentation Query Optimization

**Effective topic selection:**
- ✅ Specific: "hooks", "dependency injection", "payment intents"
- ❌ Generic: "react", "fastapi", "stripe"

**Token allocation:**
- Quick reference: 1000-1500 tokens
- Learning patterns: 2000-3000 tokens  
- Comprehensive research: 5000+ tokens

### 2. Browser Monitoring Best Practices

**Start monitoring before testing:**
```javascript
// Always navigate first
mcp__puppeteer__puppeteer_navigate({ url: "http://localhost:3000" })

// Then perform your tests
mcp__puppeteer__puppeteer_evaluate({ script: "your test code" })
```

**Monitor during critical operations:**
- Form submissions
- API calls
- Authentication flows
- Payment processing

### 3. Common Anti-Patterns to Avoid

**❌ Don't skip research:**
```javascript
// Bad: Implementing without understanding patterns
// Immediately start coding without Context7 research
```

**❌ Don't ignore console errors:**
```javascript
// Bad: Not monitoring browser logs during development
// Missing JavaScript errors that break functionality
```

**❌ Don't use generic documentation queries:**
```javascript
// Bad: Too broad
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/react_dev"
  // No topic specified - returns overwhelming results
})

// Good: Focused query
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/react_dev",
  topic: "useState optimization",
  tokens: 2000
})
```

## Team Collaboration

### Code Review Integration

**Reviewers should verify:**
1. ✅ Research documentation was consulted (check commit messages)
2. ✅ No console errors during manual testing
3. ✅ Implementation follows documented patterns
4. ✅ Browser testing was performed

**Documentation in PRs:**
```markdown
## Context7 Research
- React hooks patterns: ✅ Consulted `/context7/react_dev` 
- Form validation: ✅ Reviewed best practices
- API integration: ✅ FastAPI dependency injection patterns

## Browser Testing
- ✅ No console errors
- ✅ Form submissions work correctly
- ✅ API calls return expected responses
```

### Onboarding New Team Members

**Week 1: Setup and Basic Usage**
1. Configure MCP servers
2. Complete verification steps
3. Practice with guided examples

**Week 2: Technology-Specific Workflows**  
1. Learn frontend patterns (React/Next.js)
2. Learn backend patterns (FastAPI/SQLAlchemy)
3. Practice combined workflows

**Week 3: Advanced Integration**
1. Payment flow testing
2. Complex form validation
3. Real-time debugging scenarios

### Knowledge Sharing

**Weekly Team Practices:**
- Share effective Context7 queries in team chat
- Demo browser debugging techniques
- Review common patterns discovered

**Documentation Contributions:**
- Add new pattern examples to this guide
- Share Context7 library discoveries
- Document debugging workflows

## Troubleshooting

### Context7 Issues

**Library not found:**
```javascript
// Try alternative search terms
mcp__context7__resolve-library-id({ libraryName: "nextjs" })
mcp__context7__resolve-library-id({ libraryName: "next.js" })
mcp__context7__resolve-library-id({ libraryName: "next" })
```

**Documentation too broad:**
```javascript
// Add more specific topics
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/react_dev",
  topic: "useEffect cleanup patterns", // Very specific
  tokens: 1500
})
```

### Browser Logs Issues

**Chrome not responding:**
```bash
# Restart Chrome debug mode
./scripts/start-chrome-debug.sh
```

**Page not loading:**
```javascript
// Check development server is running
// Navigate to correct URL
mcp__puppeteer__puppeteer_navigate({ url: "http://localhost:3000" })
```

### Integration Issues

**Hooks not working:**
1. Check Claude Code MCP configuration
2. Restart Claude Code
3. Verify all MCP servers are running

## Success Metrics

**Individual Developer:**
- 📈 Faster feature implementation (target: 30% reduction)
- 📈 Fewer debugging sessions (target: 50% reduction)  
- 📈 Better code quality (fewer post-deployment bugs)

**Team Level:**
- 📈 Consistent implementation patterns
- 📈 Reduced code review iterations
- 📈 Faster onboarding of new team members

**Project Level:**
- 📈 Higher code maintainability
- 📈 Better documentation coverage
- 📈 Reduced technical debt

## Next Steps

1. **Complete this setup guide** for all team members
2. **Practice with real BookedBarber features** 
3. **Collect feedback** and refine workflows
4. **Expand integration** to testing and deployment
5. **Share learnings** with other development teams

---

**Status**: Phase 1 Complete (2025-07-14)  
**Next Phase**: Enhanced automation and team-wide adoption  
**Contact**: Update this guide based on team feedback and usage patterns