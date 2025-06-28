# 003. No Duplicate Components

Date: 2025-06-28

## Status

Accepted

## Context

The codebase had accumulated multiple versions of similar components:
- `BookingModal`, `EnhancedBookingModal`, `SimpleBookingModal`
- `PaymentStep`, `EnhancedPaymentStep`, `DemoPaymentStep`
- `Dashboard`, `SimpleDashboard`, `AdminDashboard`

This duplication caused:
- Confusion about which component to use
- Inconsistent user experience
- Bug fixes needed in multiple places
- Increased bundle size
- Maintenance overhead

## Decision

We enforce a strict "one component per purpose" rule:

1. **Single Component**: Only one component for each distinct UI element
2. **Composition Over Duplication**: Use props and composition for variations
3. **No Prefixes**: No "Enhanced", "Simple", "Demo", "Legacy" prefixes
4. **Feature Flags**: Use feature flags for experimental features, not duplicate components

Example:
```typescript
// WRONG
<SimpleBookingModal />
<EnhancedBookingModal />

// RIGHT
<BookingModal enhanced={featureFlags.enhancedBooking} />
```

## Consequences

### Positive
- Clear component architecture
- Consistent user experience
- Single point of maintenance
- Smaller bundle size
- Easier onboarding for new developers

### Negative
- More complex components with conditional logic
- Careful prop design required
- Migration effort for existing duplicates

### Neutral
- Components may have more props
- Feature variations handled internally

## References

- React Composition: https://react.dev/learn/thinking-in-react
- Feature Flags: https://martinfowler.com/articles/feature-toggles.html
- DRY Principle: https://en.wikipedia.org/wiki/Don%27t_repeat_yourself