# Context7 Quick Reference for BookedBarber Development

## 🚀 Quick Start Commands

### Common Library Lookups
```bash
# React Hooks Documentation
npm run docs:react

# Next.js App Router Documentation
npm run docs:nextjs

# FastAPI Dependency Injection
npm run docs:fastapi

# Stripe Payment Processing
npm run docs:stripe

# SQLAlchemy Relationships
npm run docs:sqlalchemy

# Search for any library
npm run docs:search
```

## 📋 BookedBarber-Specific Examples

### Frontend Development

#### React Components & Hooks
```javascript
// Get React hooks best practices
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/react_dev",
  topic: "custom hooks",
  tokens: 2500
})

// Get performance optimization patterns
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/react_dev",
  topic: "performance optimization",
  tokens: 2000
})
```

#### Next.js Booking Pages
```javascript
// App Router routing for booking pages
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/nextjs",
  topic: "dynamic routes",
  tokens: 2000
})

// Server components for barber profiles
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/nextjs",
  topic: "server components",
  tokens: 2500
})
```

### Backend Development

#### FastAPI Authentication
```javascript
// OAuth2 authentication patterns
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/tiangolo/fastapi",
  topic: "oauth2",
  tokens: 2000
})

// JWT token handling
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/tiangolo/fastapi",
  topic: "security",
  tokens: 2500
})
```

#### Database Relationships
```javascript
// SQLAlchemy relationship patterns for booking system
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/sqlalchemy/sqlalchemy",
  topic: "one to many relationships",
  tokens: 2500
})

// Advanced querying for appointments
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/sqlalchemy/sqlalchemy",
  topic: "query optimization",
  tokens: 2000
})
```

### Payment Integration

#### Stripe Payment Intents
```javascript
// Payment intent creation for appointments
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/stripe/stripe-python",
  topic: "payment intents",
  tokens: 2000
})

// Stripe Connect for barber payouts
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/stripe/stripe-python",
  topic: "connect",
  tokens: 2500
})
```

## 🎯 Development Workflow Integration

### Pre-Implementation Research
Before implementing any new feature:
1. **Search for the library**: `npm run docs:search`
2. **Get specific documentation**: Use the appropriate `docs:*` command
3. **Focus on your use case**: Use specific topics like "authentication", "hooks", etc.

### During Development
- **Getting stuck?** → Look up patterns in Context7
- **Need best practices?** → Search for "best practices" or "patterns" topics
- **API questions?** → Get exact API documentation

### Code Review
- **Verify patterns**: Check implementation against official documentation
- **Security review**: Look up security best practices for your stack
- **Performance check**: Research optimization patterns

## 📚 Library-Specific Quick Commands

### React Development
```javascript
// Component patterns
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/react_dev",
  topic: "component patterns",
  tokens: 2000
})

// Error boundaries for booking components
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/react_dev",
  topic: "error boundaries",
  tokens: 1500
})
```

### Next.js Development
```javascript
// API routes for booking endpoints
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/nextjs",
  topic: "api routes",
  tokens: 2000
})

// Middleware for authentication
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/nextjs",
  topic: "middleware",
  tokens: 1500
})
```

### FastAPI Development
```javascript
// Background tasks for email notifications
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/tiangolo/fastapi",
  topic: "background tasks",
  tokens: 2000
})

// WebSocket for real-time booking updates
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/tiangolo/fastapi",
  topic: "websockets",
  tokens: 2500
})
```

## 🔧 Troubleshooting Common Issues

### Authentication Problems
```javascript
// JWT implementation patterns
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/tiangolo/fastapi",
  topic: "jwt authentication",
  tokens: 2000
})
```

### Database Issues
```javascript
// SQLAlchemy migration patterns
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/sqlalchemy/sqlalchemy",
  topic: "migrations",
  tokens: 1500
})
```

### Payment Processing Issues
```javascript
// Stripe error handling
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/stripe/stripe-python",
  topic: "error handling",
  tokens: 1500
})
```

### Frontend Performance Issues
```javascript
// React performance optimization
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/react_dev",
  topic: "performance",
  tokens: 2000
})
```

## 💡 Tips for Effective Context7 Usage

### 1. Use Specific Topics
Instead of generic requests, be specific:
- ❌ General: `topic: "react"`
- ✅ Specific: `topic: "useEffect cleanup"`

### 2. Appropriate Token Limits
- **Quick reference**: 1000-1500 tokens
- **Learning new concepts**: 2000-2500 tokens
- **Comprehensive guides**: 3000+ tokens

### 3. Choose High-Quality Sources
Look for:
- **Trust Score 9-10**: Official sources
- **High snippet count**: More examples
- **Recent versions**: Up-to-date patterns

### 4. Combine with Existing Knowledge
- Use Context7 to **verify** your approach
- **Compare** different implementation patterns
- **Validate** against current best practices

## 🚀 Integration with Existing Tools

### With Git Workflow
```bash
# Before starting a feature
git checkout -b feature/new-booking-flow
npm run docs:react  # Research patterns first

# During development
# Use Context7 for specific questions

# Before committing
# Verify patterns against documentation
```

### With Testing
```javascript
// Get testing patterns for your components
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/react_dev",
  topic: "testing",
  tokens: 2000
})
```

### With Debugging
```javascript
// Get debugging strategies
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/tiangolo/fastapi",
  topic: "debugging",
  tokens: 1500
})
```

---

**Remember**: Context7 enhances your development workflow by providing instant access to current, accurate documentation. Use it as your first stop for research, verification, and learning new patterns.

Last Updated: 2025-01-14