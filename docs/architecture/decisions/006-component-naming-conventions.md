# 006. Component Naming Conventions

Date: 2025-06-28

## Status

Accepted

## Context

Component naming had become inconsistent and confusing:
- Prefixes like "Enhanced", "Simple", "Demo", "Legacy"
- Versioning in names: "BookingModalV2", "DashboardNew"
- Implementation details in names: "BookingModalWithStripe"
- Unclear hierarchy: "BaseButton", "Button", "ButtonComponent"

This caused:
- Difficulty finding the right component
- Unclear which version to use
- Naming conflicts
- Poor discoverability

## Decision

We enforce strict component naming conventions:

1. **No Prefixes/Suffixes**:
   - ❌ `EnhancedBookingModal`, `SimpleBookingModal`
   - ✅ `BookingModal`

2. **Clear, Purpose-Based Names**:
   - ❌ `HeaderNew`, `HeaderV2`
   - ✅ `Header`

3. **Composition Pattern for Variants**:
   - ❌ `ButtonPrimary`, `ButtonSecondary`
   - ✅ `Button` with `variant="primary"`

4. **Folder Structure Indicates Hierarchy**:
```
components/
├── common/
│   └── Button.tsx
├── booking/
│   └── BookingModal.tsx
└── dashboard/
    └── Dashboard.tsx
```

5. **Feature Flags for Experiments**:
   - ❌ `ExperimentalBookingFlow`
   - ✅ `BookingFlow` with feature flag

## Consequences

### Positive
- Clear, discoverable component names
- No confusion about which component to use
- Better IDE autocomplete
- Cleaner imports
- Easier refactoring

### Negative
- Need to refactor existing components
- More complex internal component logic
- Careful migration planning required

### Neutral
- Single component may handle multiple variants
- Props determine behavior, not component name

## References

- React Component Patterns: https://react.dev/learn/thinking-in-react
- Naming Guidelines: https://github.com/kettanaito/naming-cheatsheet
- Airbnb React Style Guide: https://github.com/airbnb/javascript/tree/master/react