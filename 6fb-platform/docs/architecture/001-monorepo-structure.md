# ADR-001: Monorepo Structure

## Status
Accepted

## Context
The 6FB booking platform has grown to include multiple applications and shared code. The previous structure led to:
- Code duplication across frontend and backend
- Inconsistent types and interfaces
- Difficult dependency management
- Slow build times
- Hard to enforce architectural boundaries

## Decision
We will adopt a monorepo structure using Nx with clearly defined package boundaries:

1. **@6fb/core** - Contains all shared business logic, types, and utilities
2. **@6fb/api** - FastAPI backend implementation
3. **@6fb/web** - Next.js web application
4. **@6fb/ui** - Shared React component library
5. **@6fb/mobile** - React Native mobile app (future)

### Dependency Rules
- Core has no dependencies on other packages
- API depends only on Core
- UI depends only on Core
- Web depends on Core and UI
- Mobile depends on Core and UI

## Consequences

### Positive
- Single source of truth for types and business logic
- Faster development through code reuse
- Better type safety across the entire platform
- Parallel builds with Nx
- Easier to maintain and scale
- Clear architectural boundaries
- Simplified dependency management

### Negative
- Initial migration effort required
- Developers need to learn monorepo tooling
- More complex initial setup
- Requires discipline to maintain boundaries

### Mitigation
- Automated linting rules to enforce boundaries
- Build-time validation scripts
- Comprehensive migration guide
- Developer training on monorepo best practices