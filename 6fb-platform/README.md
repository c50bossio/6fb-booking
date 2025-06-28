# 6FB Platform Monorepo

A comprehensive booking and business management platform for barber shops, built with clean architecture principles.

## 🏗 Architecture

This monorepo enforces clean architecture with clear boundaries between packages:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Mobile   │     │     Web     │     │     Apps    │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                    │
       └───────────────────┴────────────────────┘
                           │
                    ┌──────▼──────┐
                    │     UI      │  (Shared Components)
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │     API     │  (Business Logic)
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │    Core     │  (Types & Utils)
                    └─────────────┘
```

## 📦 Packages

- **`@6fb/core`**: Shared types, interfaces, constants, and utilities
- **`@6fb/api`**: FastAPI backend implementation
- **`@6fb/web`**: Next.js web application
- **`@6fb/ui`**: Shared React component library
- **`@6fb/mobile`**: React Native mobile app (future)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run all services in development
npm run dev

# Run specific package
nx serve @6fb/web
nx serve @6fb/api

# Build everything
npm run build

# Run tests
npm test

# Validate architecture
npm run validate
```

## 🛠 Development

### Adding a New Feature

1. **Define types in `@6fb/core`**
   ```typescript
   // packages/core/src/types/feature.types.ts
   export interface Feature {
     id: string;
     name: string;
   }
   ```

2. **Implement API in `@6fb/api`**
   ```python
   # packages/api/src/routes/feature.py
   @router.get("/features/{id}")
   async def get_feature(id: str) -> Feature:
       return await feature_service.get(id)
   ```

3. **Create UI components in `@6fb/ui`**
   ```typescript
   // packages/ui/src/components/Feature.tsx
   export const FeatureCard: React.FC<{ feature: Feature }> = ({ feature }) => {
     return <Card>{feature.name}</Card>;
   };
   ```

4. **Use in web app `@6fb/web`**
   ```typescript
   // packages/web/src/pages/features.tsx
   import { FeatureCard } from '@6fb/ui';
   import { Feature } from '@6fb/core';
   ```

### Architecture Rules

1. **No circular dependencies** - Dependencies flow downward only
2. **No business logic in UI** - Keep components pure
3. **Single source of truth** - Types defined once in core
4. **API contracts** - All endpoints must have typed responses

### Running Tests

```bash
# Test everything
npm test

# Test specific package
nx test @6fb/core

# Test affected by changes
npm run affected:test

# E2E tests
nx e2e @6fb/web-e2e
```

### Code Quality

```bash
# Lint all code
npm run lint

# Format code
npm run format

# Validate architecture
npm run validate

# View dependency graph
npm run graph
```

## 📁 Project Structure

```
6fb-platform/
├── packages/
│   ├── core/          # Shared business logic, types, utilities
│   ├── api/           # FastAPI backend
│   ├── web/           # Next.js frontend
│   ├── ui/            # Shared components
│   └── mobile/        # React Native app
├── apps/              # Deployment configurations
├── tools/
│   ├── linter-rules/  # Custom ESLint rules
│   ├── build-guards/  # Build-time validation
│   └── scripts/       # Dev utilities
├── docs/
│   ├── architecture/  # ADRs
│   └── guides/        # Developer guides
└── [config files]
```

## 🔧 Configuration

### Environment Variables

Each package has its own `.env.example`:
- `packages/api/.env.example` - Backend configuration
- `packages/web/.env.example` - Frontend configuration

### TypeScript Paths

Configured in `tsconfig.base.json`:
```json
{
  "paths": {
    "@6fb/core": ["packages/core/src/index.ts"],
    "@6fb/core/*": ["packages/core/src/*"]
  }
}
```

## 🚦 CI/CD

### Pre-commit Hooks

Automatically runs:
1. Architecture validation
2. Linting on staged files
3. Tests for affected code

### Build Pipeline

```bash
# Validate → Lint → Test → Build
npm run ci
```

## 📚 Documentation

- [Migration Guide](./MIGRATION_GUIDE.md) - Migrate from old structure
- [Architecture Decisions](./docs/architecture/) - ADRs
- [API Documentation](./docs/api/) - OpenAPI specs
- [Component Library](http://localhost:6006) - Storybook

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Make changes following architecture rules
3. Run validation: `npm run validate`
4. Commit changes: `git commit -m 'feat: add amazing feature'`
5. Push branch: `git push origin feature/amazing-feature`
6. Open Pull Request

## 📄 License

Copyright © 2024 6FB Platform. All rights reserved.