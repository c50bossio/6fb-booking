# Context7 Usage Examples for BookedBarber Features

## 🎯 Real BookedBarber Development Scenarios

This document provides Context7 query examples based on actual BookedBarber features and development needs.

## 📅 Appointment System Development

### Appointment Booking Flow
```javascript
// When working on appointment creation logic
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/tiangolo/fastapi",
  topic: "request validation",
  tokens: 2000
})

// For appointment conflict detection
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/sqlalchemy/sqlalchemy",
  topic: "query filters",
  tokens: 2500
})

// React calendar component optimization
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/react_dev",
  topic: "memo optimization",
  tokens: 2000
})
```

### Recurring Appointments
```javascript
// Implementing recurring appointment patterns
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/sqlalchemy/sqlalchemy",
  topic: "batch operations",
  tokens: 2500
})

// Cron job patterns for recurring bookings
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/tiangolo/fastapi",
  topic: "background tasks",
  tokens: 2000
})
```

### Calendar Integration
```javascript
// Google Calendar API integration patterns
mcp__context7__resolve-library-id({
  libraryName: "google calendar api"
})

// Two-way sync implementation
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/tiangolo/fastapi",
  topic: "webhook handling",
  tokens: 2500
})
```

## 💳 Payment & Billing System

### Stripe Payment Processing
```javascript
// Payment intent creation for appointments
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/stripe/stripe-python",
  topic: "payment intents",
  tokens: 2500
})

// Handling payment webhooks
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/stripe/stripe-python",
  topic: "webhooks",
  tokens: 2000
})

// Failed payment retry logic
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/stripe/stripe-python",
  topic: "invoice retry",
  tokens: 2000
})
```

### Commission System
```javascript
// Stripe Connect for barber payouts
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/stripe/stripe-python",
  topic: "connect transfers",
  tokens: 2500
})

// Multi-party payment splitting
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/stripe/stripe-python",
  topic: "marketplace",
  tokens: 3000
})
```

### Billing & Invoicing
```javascript
// Automated invoice generation
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/stripe/stripe-python",
  topic: "invoicing",
  tokens: 2500
})

// Subscription billing for premium features
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/stripe/stripe-python",
  topic: "subscriptions",
  tokens: 3000
})
```

## 🔐 Authentication & Security

### JWT Authentication
```javascript
// FastAPI OAuth2 implementation
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/tiangolo/fastapi",
  topic: "oauth2 jwt",
  tokens: 2500
})

// Password hashing best practices
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/tiangolo/fastapi",
  topic: "password security",
  tokens: 2000
})
```

### Role-Based Access Control
```javascript
// FastAPI dependency injection for permissions
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/tiangolo/fastapi",
  topic: "dependencies",
  tokens: 2500
})

// SQLAlchemy user roles modeling
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/sqlalchemy/sqlalchemy",
  topic: "many to many relationships",
  tokens: 2000
})
```

## 📊 Analytics & Reporting

### Business Intelligence Dashboard
```javascript
// React Chart.js integration
mcp__context7__resolve-library-id({
  libraryName: "chart.js"
})

// Performance optimization for large datasets
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/react_dev",
  topic: "virtualization",
  tokens: 2500
})
```

### AI Analytics
```javascript
// FastAPI integration with ML models
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/tiangolo/fastapi",
  topic: "machine learning",
  tokens: 2500
})

// Async processing for analytics
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/tiangolo/fastapi",
  topic: "async background",
  tokens: 2000
})
```

## 🎨 Frontend Development

### Next.js App Router Implementation
```javascript
// Dynamic routes for barber profiles
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/nextjs",
  topic: "dynamic routing",
  tokens: 2000
})

// Server-side rendering for SEO
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/nextjs",
  topic: "server side rendering",
  tokens: 2500
})

// API routes for internal APIs
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/nextjs",
  topic: "api routes",
  tokens: 2000
})
```

### Component Architecture
```javascript
// Calendar component state management
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/react_dev",
  topic: "complex state",
  tokens: 2500
})

// Form handling for booking forms
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/react_dev",
  topic: "forms",
  tokens: 2000
})

// Error boundaries for payment components
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/react_dev",
  topic: "error boundaries",
  tokens: 1500
})
```

## 🔄 Data Management

### Database Relationships
```javascript
// One-to-many: User -> Appointments
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/sqlalchemy/sqlalchemy",
  topic: "one to many",
  tokens: 2000
})

// Many-to-many: Appointments -> Services
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/sqlalchemy/sqlalchemy",
  topic: "association objects",
  tokens: 2500
})

// Self-referential: User referrals
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/sqlalchemy/sqlalchemy",
  topic: "self referential",
  tokens: 2000
})
```

### Database Migrations
```javascript
// Alembic migration best practices
mcp__context7__resolve-library-id({
  libraryName: "alembic"
})

// Data migration patterns
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/sqlalchemy/alembic",
  topic: "data migrations",
  tokens: 2500
})
```

## 📱 Mobile & Responsive Design

### Touch-Friendly Calendar
```javascript
// React touch event handling
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/react_dev",
  topic: "touch events",
  tokens: 2000
})

// Mobile gesture recognition
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/react_dev",
  topic: "gesture handling",
  tokens: 2500
})
```

### Progressive Web App
```javascript
// Next.js PWA implementation
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/nextjs",
  topic: "progressive web app",
  tokens: 2500
})

// Service worker for offline functionality
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/nextjs",
  topic: "service workers",
  tokens: 2000
})
```

## 🚀 Performance Optimization

### Backend Performance
```javascript
// FastAPI async performance
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/tiangolo/fastapi",
  topic: "async performance",
  tokens: 2500
})

// Database query optimization
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/sqlalchemy/sqlalchemy",
  topic: "query optimization",
  tokens: 3000
})

// Caching strategies
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/tiangolo/fastapi",
  topic: "caching",
  tokens: 2000
})
```

### Frontend Performance
```javascript
// React lazy loading
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/react_dev",
  topic: "code splitting",
  tokens: 2000
})

// Next.js image optimization
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/nextjs",
  topic: "image optimization",
  tokens: 2000
})

// Bundle size optimization
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/nextjs",
  topic: "bundle optimization",
  tokens: 2500
})
```

## 🔧 Testing & Quality Assurance

### API Testing
```javascript
// FastAPI testing patterns
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/tiangolo/fastapi",
  topic: "testing",
  tokens: 2500
})

// Pytest async testing
mcp__context7__resolve-library-id({
  libraryName: "pytest"
})
```

### Frontend Testing
```javascript
// React Testing Library patterns
mcp__context7__resolve-library-id({
  libraryName: "testing library"
})

// End-to-end testing with Playwright
mcp__context7__resolve-library-id({
  libraryName: "playwright"
})
```

## 🚨 Error Handling & Monitoring

### Error Handling
```javascript
// FastAPI exception handling
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/tiangolo/fastapi",
  topic: "exception handling",
  tokens: 2000
})

// React error boundaries
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/context7/react_dev",
  topic: "error boundaries",
  tokens: 2000
})
```

### Monitoring & Logging
```javascript
// FastAPI logging best practices
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/tiangolo/fastapi",
  topic: "logging",
  tokens: 2000
})

// Sentry integration patterns
mcp__context7__resolve-library-id({
  libraryName: "sentry"
})
```

## 🎯 Context7 Usage Tips for BookedBarber

### Development Workflow
1. **Before starting a feature**: Research patterns with Context7
2. **During implementation**: Use for specific API questions
3. **During debugging**: Look up error handling patterns
4. **Before code review**: Verify against best practices

### Common Token Allocations
- **Quick API reference**: 1500 tokens
- **Implementation patterns**: 2000-2500 tokens
- **Comprehensive guides**: 3000+ tokens

### BookedBarber-Specific Topics
- Use **"payment intents"** not just "payments"
- Use **"background tasks"** for async operations
- Use **"dependency injection"** for FastAPI auth
- Use **"relationships"** for SQLAlchemy modeling

---

**Remember**: These examples are based on actual BookedBarber features. Use them as starting points and modify the topics based on your specific implementation needs.

Last Updated: 2025-01-14