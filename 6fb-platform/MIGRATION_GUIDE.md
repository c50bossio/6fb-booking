# 6FB Platform Migration Guide

This guide helps you migrate from the existing 6fb-booking structure to the new monorepo architecture.

## Overview

The new monorepo structure enforces clean architecture principles:
- **Separation of Concerns**: Each package has a specific responsibility
- **Dependency Direction**: Dependencies only flow downward (UI → Core, never Core → UI)
- **No Duplication**: Shared code lives in one place
- **Type Safety**: Single source of truth for all types
- **Build-time Validation**: Architecture violations caught before deployment

## New Structure

```
6fb-platform/
├── packages/
│   ├── core/          # Business logic, types, utilities
│   ├── api/           # FastAPI backend implementation
│   ├── web/           # Next.js web application
│   ├── ui/            # Shared React components
│   └── mobile/        # React Native app (future)
├── tools/
│   ├── linter-rules/  # Custom ESLint rules
│   ├── build-guards/  # Architecture validation
│   └── scripts/       # Development utilities
├── apps/              # Deployment configurations
│   ├── api/           # API server setup
│   └── web/           # Web app setup
└── docs/
    ├── architecture/  # Architecture decisions
    └── guides/        # Development guides
```

## Migration Steps

### Phase 1: Setup (Day 1)

1. **Initialize the monorepo**
   ```bash
   cd 6fb-platform
   npm install
   npx nx init
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

### Phase 2: Core Package Migration (Day 2-3)

1. **Migrate shared types**
   - Move from `backend/models/*.py` → `packages/core/src/types/`
   - Convert Python types to TypeScript
   - Example mapping:
     ```python
     # Old (Python)
     class User(BaseModel):
         id: int
         email: str
         role: UserRole
     ```
     ```typescript
     // New (TypeScript)
     export interface User extends BaseEntity {
         id: string;
         email: string;
         role: UserRole;
     }
     ```

2. **Migrate business constants**
   - Move from scattered constants → `packages/core/src/constants/`
   - Consolidate duplicate definitions

3. **Migrate utilities**
   - Move shared utilities → `packages/core/src/utils/`
   - Examples: date formatting, validation, calculations

### Phase 3: API Package Migration (Day 4-6)

1. **Migrate FastAPI backend**
   - Copy `backend/` → `packages/api/src/`
   - Update imports to use `@6fb/core`
   - Remove duplicate type definitions

2. **Update API structure**
   ```
   packages/api/src/
   ├── server.ts         # Main entry point
   ├── routes/           # API routes
   ├── services/         # Business logic
   ├── repositories/     # Data access
   └── middleware/       # Express middleware
   ```

3. **Migrate database models**
   - Keep SQLAlchemy models in `packages/api/src/models/`
   - Ensure they implement interfaces from `@6fb/core`

### Phase 4: UI Package Migration (Day 7-8)

1. **Extract shared components**
   - Move from `frontend/src/components/ui/` → `packages/ui/src/components/`
   - Remove business logic from UI components
   - Add Storybook stories for each component

2. **Create component index**
   ```typescript
   // packages/ui/src/index.ts
   export * from './components/Button';
   export * from './components/Card';
   export * from './components/Modal';
   // etc...
   ```

### Phase 5: Web Package Migration (Day 9-11)

1. **Migrate Next.js app**
   - Copy `frontend/` → `packages/web/`
   - Update imports:
     - `import { Button } from '../components/ui'` → `import { Button } from '@6fb/ui'`
     - `import { User } from '../types'` → `import { User } from '@6fb/core'`

2. **Update API calls**
   - Use types from `@6fb/core`
   - Centralize API client configuration

### Phase 6: Setup Build & Deploy (Day 12)

1. **Configure build pipeline**
   ```json
   // apps/api/package.json
   {
     "scripts": {
       "build": "nx build @6fb/api",
       "start": "node dist/packages/api/server.js"
     }
   }
   ```

2. **Update deployment configs**
   - Update `render.yaml` for new structure
   - Update Docker configs
   - Update CI/CD pipelines

## Validation Checklist

Run these commands to validate your migration:

```bash
# Validate architecture
npm run validate

# Run all tests
npm test

# Build all packages
npm run build

# Check for circular dependencies
npx nx graph
```

## Common Issues & Solutions

### Issue: Circular Dependencies
**Solution**: Move shared code to `@6fb/core`

### Issue: Type Conflicts
**Solution**: Remove duplicates, keep only in `@6fb/core`

### Issue: Build Failures
**Solution**: Check import paths, ensure proper package.json exports

### Issue: Runtime Errors
**Solution**: Verify all environment variables are set in new locations

## Benefits After Migration

1. **Faster Development**
   - Change once, update everywhere
   - Better IntelliSense and type safety
   - Parallel builds with Nx

2. **Better Code Quality**
   - Enforced architecture rules
   - No accidental coupling
   - Clear dependency graph

3. **Easier Testing**
   - Test packages in isolation
   - Shared test utilities
   - Better test coverage

4. **Scalability**
   - Easy to add new packages
   - Mobile app ready to add
   - Microservices-ready architecture

## Next Steps

After migration:
1. Set up pre-commit hooks for architecture validation
2. Configure automated dependency updates
3. Set up package versioning strategy
4. Document API contracts between packages
5. Create developer onboarding guide

## Resources

- [Nx Documentation](https://nx.dev)
- [Clean Architecture Principles](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Monorepo Best Practices](https://monorepo.tools)
- Internal docs: `/docs/architecture/`