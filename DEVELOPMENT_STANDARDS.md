# 6FB Platform Development Standards

> **This is the authoritative guide for all development on the 6FB platform. All developers MUST read and follow these standards.**

## 🚨 The Problem We're Solving

Our codebase grew from ~1,000 to 9,227 files with massive duplication:
- 7 different authentication systems
- 10+ payment processing implementations
- 8 calendar component variants
- 16 duplicate components with similar names
- Test files scattered everywhere

**This stops now.**

## 🛡️ Our Solution: Enforcement-Based Development

We've implemented multiple layers of automated enforcement that make it **impossible** to introduce bad code:

### 1. **Pre-Commit Hooks** (First Line of Defense)
```bash
# Install once
./install-pre-commit-hooks.sh
```

These hooks BLOCK commits that contain:
- ❌ Test files in root directory
- ❌ Files with prefixes: `test-`, `demo-`, `enhanced-`, `simple-`
- ❌ Duplicate React components
- ❌ Multiple auth systems
- ❌ More than 20 files per commit
- ❌ Database files (.db, .sqlite)
- ❌ Duplicate API endpoints

### 2. **ESLint Custom Rules** (Code Quality Gates)
```bash
# Run manually
npm run lint
```

Our custom ESLint plugin enforces:
- ✅ No duplicate component names
- ✅ No "Enhanced", "Simple", "Demo" prefixes
- ✅ Single implementation of auth/payment
- ✅ Maximum components per directory
- ✅ No copy-paste code patterns

### 3. **Build-Time Validation** (Final Defense)
```bash
# Automatically runs on build
npm run build
```

Build FAILS if it detects:
- 🚫 Duplicate components
- 🚫 Forbidden file patterns
- 🚫 Multiple auth systems
- 🚫 Bundle size exceeded
- 🚫 Unregistered components

### 4. **CI/CD Pipeline** (Server-Side Enforcement)
Every PR is checked for:
- ✅ All pre-commit hooks pass
- ✅ ESLint rules compliance
- ✅ Build validation success
- ✅ Bundle size limits
- ✅ Import boundaries

## 📁 New Monorepo Structure

```
6fb-platform/
├── packages/
│   ├── core/          # Shared types, utils, business logic
│   ├── api/           # Single FastAPI backend
│   ├── web/           # Single Next.js frontend
│   ├── ui/            # Shared component library
│   └── mobile/        # React Native app (future)
├── apps/              # Deployment configurations
├── tools/             # Development tools
└── docs/              # All documentation
```

### Import Rules:
- ✅ `@6fb/core` - Can be imported by anyone
- ✅ `@6fb/ui` - Only by web and mobile
- ❌ `@6fb/web` - Cannot import from `@6fb/api`
- ❌ Cross-package imports not allowed

## 🎯 Component Standards

### Naming Convention:
```typescript
// ✅ GOOD
Calendar.tsx
Dashboard.tsx
PaymentForm.tsx

// ❌ BAD
EnhancedCalendar.tsx    // No prefixes!
SimpleCalendar.tsx      // One implementation!
CalendarV2.tsx          // No versions!
TestCalendar.tsx        // Tests go in __tests__!
```

### Component Registry:
All components MUST be registered:
```typescript
// src/components/component-registry.ts
export const ALLOWED_COMPONENTS = {
  'Calendar': 'components/Calendar.tsx',
  'Dashboard': 'components/Dashboard.tsx',
  // Add new components here
};
```

## 🔐 Authentication Rules

**ONE authentication system only:**
- JWT-based authentication
- Role-based access control
- No demo modes
- No bypass endpoints
- No PIN authentication
- No emergency access

## 💳 Payment Processing Rules

**ONE payment service with adapters:**
```typescript
// ✅ GOOD
PaymentService
├── StripeAdapter
├── SquareAdapter
└── PayPalAdapter

// ❌ BAD
StripePaymentService
SquarePaymentService
EnhancedPaymentService
```

## 📝 Code Organization

### File Placement:
```
✅ Tests: __tests__/ directories
✅ Docs: /docs directory
✅ Scripts: /scripts directory
❌ NOT in root directory
❌ NOT scattered everywhere
```

### Commit Rules:
1. Maximum 20 files per commit
2. Descriptive commit messages
3. No direct commits to main
4. All commits must pass hooks

## 🚀 Development Workflow

### 1. Before Starting:
```bash
# Update your local hooks
./install-pre-commit-hooks.sh

# Check codebase health
npm run monitor

# Create feature branch
git checkout -b feature/your-feature
```

### 2. During Development:
```bash
# Validate as you code
npm run lint
npm run validate:build

# Check what you're committing
git status
git diff
```

### 3. Before Committing:
- ✅ Run tests
- ✅ Check for duplicates
- ✅ Verify single implementation
- ✅ Update component registry if needed

### 4. Handling Violations:
```bash
# If pre-commit fails:
1. Read the error message
2. Fix the specific issue
3. Do NOT bypass hooks
4. Ask for help if needed
```

## 📊 Monitoring & Compliance

### Weekly Health Checks:
```bash
# Run manually or via cron
node codebase-monitor.js
```

Tracks:
- File count trends
- Duplicate detection
- Bundle sizes
- Code complexity
- Technical debt

### Current Baseline (Must Improve):
- Health Score: 35%
- Total Files: 1,785
- Duplicates: 16
- Complexity: 14.29 avg

## 🚨 Consequences of Non-Compliance

1. **Immediate:** Commit blocked by hooks
2. **Build Time:** Build fails
3. **PR/MR:** Cannot merge
4. **Monitoring:** Alerts sent to team

## 📚 Required Reading

1. **Architecture Decisions:**
   - [ADR-001: Single Authentication System](docs/architecture/decisions/001-single-authentication-system.md)
   - [ADR-002: Unified Payment Processing](docs/architecture/decisions/002-unified-payment-processing.md)
   - [ADR-003: No Duplicate Components](docs/architecture/decisions/003-no-duplicate-components.md)

2. **Guides:**
   - [Pre-Commit Quick Reference](PRE_COMMIT_QUICK_REFERENCE.md)
   - [Build Validation Guide](backend-v2/frontend-v2/BUILD_VALIDATION.md)
   - [Migration Guide](MIGRATION_TOOLS_README.md)

## ✅ Developer Checklist

Before every commit:
- [ ] Pre-commit hooks installed
- [ ] No duplicate components
- [ ] No test files in root
- [ ] No "Enhanced/Simple" prefixes
- [ ] Single auth implementation
- [ ] Component registered (if new)
- [ ] Tests pass
- [ ] Lint passes

## 🆘 Getting Help

- **Validation Errors:** Check error message for fix instructions
- **Architecture Questions:** See ADRs in `/docs/architecture/decisions/`
- **Tool Issues:** See individual tool documentation
- **General Help:** Ask the team, don't bypass standards

---

**Remember:** These standards exist to prevent the codebase from becoming unmaintainable again. Following them is not optional - it's enforced automatically. The tools are here to help you succeed, not to punish you.

Last Updated: 2025-06-28
