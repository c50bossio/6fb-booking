# Development Workflow Guide

This guide outlines the development workflow for the 6FB Platform monorepo.

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- Git

### Initial Setup
```bash
# Clone the repository
git clone <repository-url>
cd 6fb-platform

# Install dependencies
npm install

# Run initial validation
npm run validate
```

## Daily Development Workflow

### 1. Start Development Servers
```bash
# Start all services (API + Web)
npm run dev

# Or start individually
nx serve @6fb/api   # Backend on http://localhost:8000
nx serve @6fb/web   # Frontend on http://localhost:3000
```

### 2. Making Changes

#### Adding a New Feature
1. **Define the data model in Core**
   ```typescript
   // packages/core/src/types/feature.types.ts
   export interface NewFeature {
     id: string;
     // ... properties
   }
   ```

2. **Implement API endpoint**
   ```python
   # packages/api/src/routes/feature.py
   @router.post("/features")
   async def create_feature(data: NewFeature):
       # Implementation
   ```

3. **Create UI components**
   ```typescript
   // packages/ui/src/components/NewFeature.tsx
   import { NewFeature } from '@6fb/core';
   
   export const NewFeatureComponent = () => {
     // Component implementation
   };
   ```

4. **Use in the web app**
   ```typescript
   // packages/web/src/pages/features/new.tsx
   import { NewFeatureComponent } from '@6fb/ui';
   ```

### 3. Testing Your Changes

```bash
# Run tests for affected packages
npm run affected:test

# Run specific package tests
nx test @6fb/core
nx test @6fb/ui

# Run e2e tests
nx e2e @6fb/web-e2e
```

### 4. Code Quality Checks

```bash
# Lint your code
npm run lint

# Format code
npm run format

# Validate architecture
npm run validate
```

### 5. Committing Changes

The pre-commit hook will automatically:
1. Run architecture validation
2. Lint staged files
3. Run affected tests

```bash
git add .
git commit -m "feat: add new feature"
```

## Common Tasks

### Creating a New Component
```bash
# Generate a new UI component
nx g @nx/react:component Button --project=ui --directory=components

# Generate with Storybook story
nx g @nx/react:component Button --project=ui --directory=components --story
```

### Running Storybook
```bash
# Start Storybook for UI components
nx storybook @6fb/ui
```

### Building for Production
```bash
# Build all packages
npm run build

# Build specific package
nx build @6fb/web
```

### Viewing Dependency Graph
```bash
# Open interactive dependency graph
npm run graph
```

## Package-Specific Workflows

### Core Package
- Only contains types, interfaces, and pure utility functions
- No external dependencies (except for validation libraries)
- All exports must be documented with JSDoc

### API Package
- Follows FastAPI conventions
- Database migrations in `packages/api/migrations/`
- API routes must have corresponding types in Core

### UI Package
- Pure presentational components only
- No business logic or API calls
- Every component must have:
  - TypeScript types
  - Storybook story
  - Unit tests

### Web Package
- Pages use components from UI package
- API calls use types from Core package
- State management with Zustand or React Context

## Troubleshooting

### Import Errors
```bash
# If you get "Cannot find module '@6fb/core'"
npm run build -- @6fb/core
```

### Type Errors
```bash
# Rebuild TypeScript references
nx reset
npm install
```

### Test Failures
```bash
# Clear test cache
nx test @6fb/web --clearCache
```

## Best Practices

1. **Always define types first** in Core package
2. **Keep components pure** - no business logic in UI
3. **Use workspace imports** - `@6fb/core` not relative paths
4. **Run validation before pushing** - `npm run validate`
5. **Keep packages focused** - don't mix concerns
6. **Document exports** - especially in Core package
7. **Test in isolation** - packages should work independently

## CI/CD Integration

The pipeline runs:
1. Architecture validation
2. Linting
3. Type checking
4. Unit tests
5. Build
6. E2E tests

Failed checks will block merge to main branch.

## Getting Help

- Architecture questions: See `/docs/architecture/`
- Component examples: Run `nx storybook @6fb/ui`
- API documentation: `http://localhost:8000/docs`
- Dependency graph: `npm run graph`