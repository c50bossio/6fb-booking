# no-prefixed-components

Disallow components with prefixes like "Enhanced", "Simple", "Demo", "Test" in production code.

## Rule Details

This rule helps maintain clean component naming by preventing the use of temporary or variant prefixes. These prefixes often indicate:

- Code duplication (Enhanced vs regular version)
- Poor architecture (Simple vs complex instead of configurable)
- Test/demo code in production
- Technical debt (Old/New versions coexisting)

Examples of **incorrect** code for this rule:

```javascript
// ❌ Bad: Using prefixes instead of composition
export function EnhancedCalendar() {
  return <Calendar withAdvancedFeatures />;
}

export function SimpleButton() {
  return <button className="basic" />;
}

export function DemoChart() {
  return <Chart data={mockData} />;
}

export function TestModal() {
  return <Modal isTest />;
}
```

Examples of **correct** code for this rule:

```javascript
// ✅ Good: Use props for variations
export function Calendar({ enhanced = false }) {
  return enhanced ? <AdvancedCalendar /> : <BasicCalendar />;
}

// ✅ Good: Use descriptive names without prefixes
export function SubmitButton() {
  return <button type="submit" />;
}

// ✅ Good: Move demo code to appropriate locations
// src/examples/ChartExample.tsx
export function ChartExample() {
  return <Chart data={mockData} />;
}
```

## Options

### `forbiddenPrefixes`

Type: `string[]`
Default: `['Enhanced', 'Simple', 'Demo', 'Test', 'Mock', 'Temp', 'Old', 'New']`

List of prefixes that are not allowed in component names.

```json
{
  "6fb/no-prefixed-components": ["error", {
    "forbiddenPrefixes": ["Beta", "Alpha", "Legacy", "V2"]
  }]
}
```

### `allowInTests`

Type: `boolean`
Default: `true`

Allow forbidden prefixes in test files (files matching `*.test.*`, `*.spec.*`, or in `__tests__` directories).

```json
{
  "6fb/no-prefixed-components": ["error", {
    "allowInTests": true
  }]
}
```

### `allowInDemos`

Type: `boolean`
Default: `true`

Allow forbidden prefixes in demo files (files matching `*.demo.*`, `*.example.*`, or in `demos/` directories).

```json
{
  "6fb/no-prefixed-components": ["error", {
    "allowInDemos": true
  }]
}
```

### `suggestions`

Type: `object`
Default: Provides helpful suggestions for each prefix

Custom suggestions for how to fix each forbidden prefix.

```json
{
  "6fb/no-prefixed-components": ["error", {
    "suggestions": {
      "Legacy": "Refactor the old component or remove if unused",
      "Beta": "Move to feature flag instead of component name"
    }
  }]
}
```

## How to Fix

### Enhanced/Simple Prefixes

Instead of creating separate enhanced and simple versions:

```javascript
// ❌ Bad
export function EnhancedForm() { /* complex form */ }
export function SimpleForm() { /* basic form */ }

// ✅ Good
export function Form({ variant = 'simple' }) {
  if (variant === 'enhanced') {
    return /* complex form */;
  }
  return /* basic form */;
}
```

### Demo/Test Prefixes

Move demo and test components to appropriate locations:

```javascript
// ❌ Bad: Demo component in production code
// src/components/DemoCalendar.tsx
export function DemoCalendar() { }

// ✅ Good: Demo in examples directory
// src/examples/CalendarExample.tsx
export function CalendarExample() { }
```

### Old/New Prefixes

Complete the migration instead of keeping both versions:

```javascript
// ❌ Bad: Both versions coexist
export function OldPaymentForm() { }
export function NewPaymentForm() { }

// ✅ Good: Single migrated version
export function PaymentForm() { }
// Use feature flags if gradual rollout is needed
```

### Temp Prefix

Temporary components should be refactored or removed:

```javascript
// ❌ Bad
export function TempSolution() { }

// ✅ Good: Either make it permanent with a proper name
export function ValidationWorkaround() { }
// Or remove it and fix the underlying issue
```

## When Not To Use It

You might want to disable this rule if:

1. You're in the middle of a large migration and need temporary prefixes
2. Your team has a specific naming convention that uses these prefixes meaningfully
3. You're working with generated code that uses these prefixes

## Related Rules

- [no-duplicate-component-names](./no-duplicate-component-names.md) - Prevents duplicate component names
- [no-multiple-implementations](./no-multiple-implementations.md) - Prevents multiple implementations of the same functionality
