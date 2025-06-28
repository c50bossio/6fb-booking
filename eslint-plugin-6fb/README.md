# eslint-plugin-6fb

Custom ESLint rules for the 6fb-booking project to detect and prevent duplicate components and bad patterns.

## Installation

```bash
cd eslint-plugin-6fb
npm install
npm run build
```

## Usage

### Frontend (Next.js)

Add to your `eslint.config.mjs`:

```javascript
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    plugins: {
      "6fb": await import("../eslint-plugin-6fb/lib/index.js"),
    },
    rules: {
      "6fb/no-duplicate-component-names": "error",
      "6fb/no-prefixed-components": "error",
      "6fb/no-multiple-implementations": "error",
      "6fb/single-source-of-truth": "error",
      "6fb/limit-directory-components": "warn",
      "6fb/no-copy-paste-code": "warn",
    },
  },
];
```

### Backend (Node.js)

Add to your `.eslintrc.js`:

```javascript
module.exports = {
  plugins: ['6fb'],
  rules: {
    '6fb/no-duplicate-component-names': 'error',
    '6fb/no-prefixed-components': 'error',
    '6fb/no-multiple-implementations': 'error',
    '6fb/single-source-of-truth': 'error',
    '6fb/limit-directory-components': 'warn',
    '6fb/no-copy-paste-code': 'warn',
  },
};
```

## Rules

### `no-duplicate-component-names`

Detects duplicate React component names across the codebase.

**✅ Good:**
```javascript
// Calendar.tsx
export function Calendar() { /* ... */ }

// BookingCalendar.tsx
export function BookingCalendar() { /* ... */ }
```

**❌ Bad:**
```javascript
// components/Calendar.tsx
export function Calendar() { /* ... */ }

// modals/Calendar.tsx
export function Calendar() { /* ... */ } // Error: Duplicate component name
```

**Options:**
- `ignoreCase` (boolean, default: false) - Compare component names case-insensitively
- `checkSimilarNames` (boolean, default: true) - Check for similar names (e.g., Calendar vs EnhancedCalendar)
- `excludePatterns` (string[], default: []) - File patterns to exclude from checking

### `no-prefixed-components`

Flags components with prefixes like "Enhanced", "Simple", "Demo", "Test" in production code.

**✅ Good:**
```javascript
// Use composition instead
export function Calendar({ enhanced = false }) {
  return enhanced ? <AdvancedView /> : <BasicView />;
}
```

**❌ Bad:**
```javascript
export function EnhancedCalendar() { /* ... */ } // Error: Forbidden prefix "Enhanced"
export function SimpleCalendar() { /* ... */ }   // Error: Forbidden prefix "Simple"
export function DemoCalendar() { /* ... */ }     // Error: Forbidden prefix "Demo"
```

**Options:**
- `forbiddenPrefixes` (string[], default: ['Enhanced', 'Simple', 'Demo', 'Test', 'Mock', 'Temp', 'Old', 'New'])
- `allowInTests` (boolean, default: true) - Allow prefixes in test files
- `allowInDemos` (boolean, default: true) - Allow prefixes in demo files

### `no-multiple-implementations`

Detects multiple implementations of the same functionality (auth providers, payment processors, etc.).

**✅ Good:**
```javascript
// Single auth service
export class AuthService {
  login() { /* ... */ }
  logout() { /* ... */ }
}

// Use it everywhere
import { AuthService } from './services/auth';
```

**❌ Bad:**
```javascript
// Multiple auth implementations
export class AuthService { /* ... */ }     // First implementation
export class AuthManager { /* ... */ }     // Error: Multiple auth implementations
export class AuthProvider { /* ... */ }    // Error: Multiple auth implementations
```

**Options:**
- `patterns` (array) - Custom patterns to check for duplicates
- `checkImports` (boolean, default: true) - Check imported modules
- `checkExports` (boolean, default: true) - Check exported modules

### `single-source-of-truth`

Enforces single source of truth for key components.

**✅ Good:**
```javascript
// Always import from canonical path
import { AuthProvider } from '@/providers/AuthProvider';
import { Calendar } from '@/components/calendar/UnifiedCalendar';
```

**❌ Bad:**
```javascript
// Different import sources
import { AuthProvider } from '@/components/auth/AuthProvider';  // Error: Use canonical path
import { Calendar } from '@/components/SimpleCalendar';         // Error: Use canonical path
```

**Options:**
- `keyComponents` (string[]) - List of components to enforce
- `canonicalPaths` (object) - Canonical import paths for each component
- `checkAllComponents` (boolean, default: false) - Check all components, not just key ones
- `allowBarrelExports` (boolean, default: true) - Allow re-exports from index files

### `limit-directory-components`

Limits the number of components in specific directories to encourage better organization.

**✅ Good:**
```
src/components/
├── auth/         (3 components)
├── booking/      (5 components)
├── calendar/     (4 components)
└── payments/     (3 components)
```

**❌ Bad:**
```
src/components/   (25 components) // Warning: Too many components in one directory
```

**Options:**
- `max` (number, default: 10) - Default maximum components per directory
- `directories` (object) - Custom limits for specific directories
- `exclude` (string[], default: ['node_modules', '__tests__']) - Directories to exclude
- `countOnlyExported` (boolean, default: true) - Only count exported components

### `no-copy-paste-code`

Detects and flags copy-paste code patterns.

**✅ Good:**
```javascript
// Shared function
function processData(data, transform) {
  return data.filter(x => x > 0).map(transform);
}

// Reuse it
const result1 = processData(data1, x => x * 2);
const result2 = processData(data2, x => x * 3);
```

**❌ Bad:**
```javascript
// Duplicated code blocks
function process1(data) {
  const filtered = data.filter(x => x > 0);
  const mapped = filtered.map(x => x * 2);
  return mapped.sort((a, b) => a - b);
}

function process2(data) {
  const filtered = data.filter(x => x > 0);  // Warning: Duplicate code
  const mapped = filtered.map(x => x * 2);
  return mapped.sort((a, b) => a - b);
}
```

**Options:**
- `minLines` (number, default: 5) - Minimum lines to consider as duplicate
- `threshold` (number, default: 0.8) - Similarity threshold (0-1)
- `ignoreComments` (boolean, default: true) - Ignore comments when comparing
- `ignoreImports` (boolean, default: true) - Ignore import statements
- `ignoreExports` (boolean, default: true) - Ignore export statements

## Recommended Configurations

### Strict Mode

For maximum code quality:

```javascript
{
  rules: {
    '6fb/no-duplicate-component-names': 'error',
    '6fb/no-prefixed-components': 'error',
    '6fb/no-multiple-implementations': 'error',
    '6fb/single-source-of-truth': 'error',
    '6fb/limit-directory-components': ['error', { max: 5 }],
    '6fb/no-copy-paste-code': 'error',
  }
}
```

### Development Mode

More lenient for development:

```javascript
{
  rules: {
    '6fb/no-duplicate-component-names': 'warn',
    '6fb/no-prefixed-components': ['warn', { allowInTests: true, allowInDemos: true }],
    '6fb/no-multiple-implementations': 'warn',
    '6fb/single-source-of-truth': 'warn',
    '6fb/limit-directory-components': ['warn', { max: 15 }],
    '6fb/no-copy-paste-code': 'off',
  }
}
```

## How to Fix Violations

### Duplicate Components

1. **Rename one of the components** to be more specific:
   ```javascript
   // Instead of two "Calendar" components:
   export function AppointmentCalendar() { /* ... */ }
   export function AvailabilityCalendar() { /* ... */ }
   ```

2. **Consolidate into a single component** with props:
   ```javascript
   export function Calendar({ mode = 'appointment' }) {
     // Handle different modes
   }
   ```

### Prefixed Components

1. **Use composition** instead of creating variants:
   ```javascript
   // Instead of EnhancedButton and SimpleButton:
   export function Button({ variant = 'simple' }) {
     // Render based on variant
   }
   ```

2. **Move to appropriate directories**:
   - Test components → `__tests__/` or `.test.tsx` files
   - Demo components → `examples/` or `.demo.tsx` files

### Multiple Implementations

1. **Choose one implementation** and remove others
2. **Create a unified service** that combines functionality:
   ```javascript
   export class UnifiedAuthService {
     // Combine all auth functionality here
   }
   ```

### Single Source of Truth

1. **Update imports** to use canonical paths:
   ```javascript
   // Update all imports to use the canonical path
   import { AuthProvider } from '@/providers/AuthProvider';
   ```

2. **Remove duplicate exports** and keep only the canonical one

### Too Many Components

1. **Create subdirectories** to organize components:
   ```
   components/
   ├── forms/
   │   ├── inputs/
   │   └── buttons/
   ├── modals/
   │   ├── booking/
   │   └── payment/
   ```

2. **Extract related components** into feature directories

### Copy-Paste Code

1. **Extract common code** into utility functions:
   ```javascript
   // utils/dataProcessing.js
   export function processAndSort(data, transform) {
     return data
       .filter(x => x > 0)
       .map(transform)
       .sort((a, b) => a - b);
   }
   ```

2. **Use higher-order functions** or **custom hooks** for React components

## Development

### Running Tests

```bash
npm test
```

### Building

```bash
npm run build
```

### Adding New Rules

1. Create rule file in `src/rules/`
2. Add rule to `src/index.ts`
3. Create test file in `src/__tests__/rules/`
4. Update this README

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for your changes
4. Ensure all tests pass
5. Submit a pull request

## License

MIT