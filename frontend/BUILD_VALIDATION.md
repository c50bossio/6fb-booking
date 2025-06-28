# Build Validation System

This project includes a comprehensive build-time validation system that enforces code quality standards and prevents common issues.

## Overview

The build validation system runs automatically during builds and can be run manually at any time. It checks for:

- **Duplicate Components**: Detects components with similar names (e.g., Calendar.tsx and EnhancedCalendar.tsx)
- **File Organization**: Enforces maximum file count limits per directory
- **Component Registry**: Validates that only allowed components are used
- **Forbidden Patterns**: Checks for test files outside test directories
- **Authentication System**: Ensures single authentication system
- **API Endpoints**: Validates API endpoint uniqueness
- **Bundle Size**: Checks bundle size limits
- **Security Issues**: Scans for potential security vulnerabilities

## How It Works

### 1. Webpack Plugin (`build-validation/webpack-validation-plugin.js`)

The core validation logic is implemented as a webpack plugin that hooks into the build process:

```javascript
// Runs before compilation
compiler.hooks.beforeCompile.tapAsync('WebpackValidationPlugin', ...)

// Validates bundle size after compilation
compiler.hooks.afterEmit.tapAsync('WebpackValidationPlugin', ...)
```

### 2. Component Registry (`src/components/component-registry.ts`)

Maintains a list of all allowed components:

```typescript
export const componentRegistry: ComponentRegistryEntry[] = [
  {
    name: 'Button',
    path: '@/components/ui/button',
    category: 'ui',
    description: 'Primary button component with variants'
  },
  // ... more components
];
```

### 3. Next.js Integration (`next.config.js`)

The validation is integrated into Next.js builds:

```javascript
const withValidation = require('./next.config.validation');
const nextConfig = withValidation(baseConfig);
```

## Running Validation

### Automatic Validation

Validation runs automatically:
- **Before builds**: via `prebuild` script
- **After builds**: via `postbuild` script
- **During development**: lighter validation in dev mode

### Manual Validation

```bash
# Run full validation
npm run validate:build

# Run post-build validation
npm run validate:build:post

# Run CI validation (stricter)
npm run validate:build:ci

# Skip validation (not recommended)
SKIP_BUILD_VALIDATION=true npm run build
```

## Validation Rules

### 1. Duplicate Component Detection

**What it checks**: Components with similar names that might be duplicates
**Examples**: 
- `Calendar.tsx` and `EnhancedCalendar.tsx`
- `Button.tsx` and `ButtonNew.tsx`

**How to fix**:
- Consolidate duplicate components into one
- Rename components to be more specific
- Remove deprecated versions

### 2. Directory File Limits

**What it checks**: Directories with too many files (default: 20)
**Why**: Large directories are hard to navigate and maintain

**How to fix**:
- Organize files into subdirectories
- Group related functionality
- Extract shared code into utilities

### 3. Component Registry Validation

**What it checks**: Components not in the allowed registry
**Why**: Prevents unauthorized third-party components and maintains consistency

**How to fix**:
- Add the component to `component-registry.ts`
- Use an approved alternative
- Request approval for new components

### 4. Forbidden File Patterns

**What it checks**: Test files outside test directories
**Patterns checked**:
- `*.test.tsx`, `*.spec.tsx`
- `__tests__` directories
- `*.stories.tsx` files

**How to fix**:
- Move test files to `__tests__` directories
- Place in `tests/` folder
- Follow project test organization

### 5. API Endpoint Uniqueness

**What it checks**: Duplicate API endpoints
**Example**: Multiple `GET /api/users` handlers

**How to fix**:
- Remove duplicate endpoints
- Consolidate handler logic
- Use different HTTP methods or paths

### 6. Authentication System

**What it checks**: Multiple authentication systems
**Systems detected**: NextAuth, Clerk, Auth0, Supabase Auth, Custom Auth

**How to fix**:
- Use single authentication system
- Remove unused auth libraries
- Consolidate auth logic

### 7. Bundle Size Limits

**What it checks**: JavaScript chunks exceeding size limits
**Default limit**: 5MB total, 200KB per chunk

**How to fix**:
- Implement code splitting
- Lazy load heavy components
- Remove unused dependencies
- Use dynamic imports

### 8. Security Issues

**What it checks**:
- `dangerouslySetInnerHTML` usage
- `eval()` calls
- Direct `innerHTML` assignment
- Hardcoded secrets

**How to fix**:
- Use safe alternatives
- Move secrets to environment variables
- Sanitize user input
- Follow security best practices

## Configuration

### Webpack Plugin Options

```javascript
new WebpackValidationPlugin({
  maxFilesPerDirectory: 20,
  maxBundleSize: 5 * 1024 * 1024, // 5MB
  componentRegistry: 'src/components/component-registry.ts',
  forbiddenPatterns: [/* regex patterns */],
  excludePaths: ['node_modules', '.next'],
  // Feature flags
  duplicateDetection: true,
  apiEndpointValidation: true,
  authSystemValidation: true
})
```

### Environment Variables

- `SKIP_BUILD_VALIDATION`: Set to `true` to skip validation (not recommended)
- `NODE_ENV`: Validation is stricter in production

## Error Messages and Remediation

### Error Format

```
❌ Errors (2):

1. DUPLICATE_COMPONENT: Duplicate component detected: Calendar
   Found in:
     - src/components/ui/Calendar.tsx
     - src/components/ui/EnhancedCalendar.tsx
   → Consider consolidating these components or renaming them to be more specific

2. BUNDLE_SIZE_LIMIT: Bundle exceeds size limit: main.js
   Size: 5.2MB (limit: 5.0MB)
   → Consider code splitting, lazy loading, or removing unused dependencies
```

### Warning Format

```
⚠️ Warnings (1):

1. DIRECTORY_FILE_LIMIT: Directory exceeds file limit: src/components/ui
   Contains 25 files (limit: 20)
   → Consider organizing files into subdirectories
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Build Validation
  run: npm run validate:build:ci
  
- name: Build
  run: npm run build
```

### Pre-commit Hook

```bash
#!/bin/sh
npm run validate:build --silent || {
  echo "Build validation failed. Fix errors before committing."
  exit 1
}
```

## Troubleshooting

### Common Issues

1. **Validation fails but code works**
   - Check if validation rules are too strict
   - Consider adjusting thresholds
   - Add exceptions for legitimate cases

2. **Build takes too long**
   - Disable some validations in development
   - Use `SKIP_BUILD_VALIDATION=true` temporarily
   - Run validation separately from builds

3. **False positives**
   - Update regex patterns
   - Add to exclude paths
   - Adjust detection algorithms

### Debugging

```bash
# Run with verbose output
node scripts/validate-build.js --verbose

# Check specific validation
node scripts/validate-build.js --only=duplicates

# Dry run without failing
node scripts/validate-build.js --dry-run
```

## Best Practices

1. **Run validation regularly**: Don't wait for CI/CD
2. **Fix warnings**: They often become errors later
3. **Update registry**: Keep component registry current
4. **Monitor bundle size**: Track size trends over time
5. **Review security issues**: Even if they seem benign

## Future Enhancements

- [ ] Visual regression testing
- [ ] Performance budget validation
- [ ] Accessibility checks
- [ ] Import cost analysis
- [ ] Unused code detection
- [ ] Circular dependency detection

## Contributing

When adding new validation rules:

1. Add logic to `webpack-validation-plugin.js`
2. Update this documentation
3. Add configuration options
4. Include clear error messages
5. Provide remediation steps