# no-duplicate-component-names

Disallow duplicate React component names across the codebase.

## Rule Details

This rule helps prevent confusion and maintainability issues by ensuring that each React component has a unique name throughout the codebase. Duplicate component names can lead to:

- Import confusion (which Calendar component to import?)
- Maintenance difficulties (updating the wrong component)
- Code review challenges (harder to understand which component is being referenced)

Examples of **incorrect** code for this rule:

```javascript
// src/components/Calendar.tsx
export function Calendar() {
  return <div>Main Calendar</div>;
}

// src/modals/Calendar.tsx
export function Calendar() { // Error: Component "Calendar" is already defined
  return <div>Modal Calendar</div>;
}
```

```javascript
// src/features/booking/Calendar.tsx
const Calendar = () => <div />;

// src/features/appointments/Calendar.tsx
const Calendar = () => <div />; // Error: Duplicate component name
```

Examples of **correct** code for this rule:

```javascript
// src/components/BookingCalendar.tsx
export function BookingCalendar() {
  return <div>Booking Calendar</div>;
}

// src/modals/CalendarModal.tsx
export function CalendarModal() {
  return <div>Calendar Modal</div>;
}
```

```javascript
// src/features/appointments/AppointmentCalendar.tsx
const AppointmentCalendar = () => <div />;

// src/features/availability/AvailabilityCalendar.tsx
const AvailabilityCalendar = () => <div />;
```

## Options

This rule accepts an options object with the following properties:

### `ignoreCase`

Type: `boolean`
Default: `false`

When set to `true`, the rule compares component names case-insensitively.

```json
{
  "6fb/no-duplicate-component-names": ["error", {
    "ignoreCase": true
  }]
}
```

With this option, `Calendar` and `calendar` would be considered duplicates.

### `checkSimilarNames`

Type: `boolean`
Default: `true`

When enabled, the rule also checks for components with similar names that might be duplicates with prefixes/suffixes removed.

```json
{
  "6fb/no-duplicate-component-names": ["error", {
    "checkSimilarNames": true
  }]
}
```

This would flag:
- `Calendar` and `EnhancedCalendar` as similar
- `Button` and `SimpleButton` as similar
- `Form` and `FormWrapper` as similar

### `excludePatterns`

Type: `string[]`
Default: `[]`

File path patterns to exclude from checking. Useful for excluding generated files or third-party code.

```json
{
  "6fb/no-duplicate-component-names": ["error", {
    "excludePatterns": ["generated/", "vendor/", "\\.stories\\.[jt]sx?$"]
  }]
}
```

## When Not To Use It

You might want to disable this rule if:

1. You're working with a legacy codebase that has many duplicate names and refactoring is not feasible
2. You have a specific naming convention that intentionally uses the same component names in different contexts
3. You're using module namespacing heavily and duplicate names are not a concern

## Related Rules

- [no-prefixed-components](./no-prefixed-components.md) - Prevents components with certain prefixes
- [single-source-of-truth](./single-source-of-truth.md) - Ensures components are exported from a single location
