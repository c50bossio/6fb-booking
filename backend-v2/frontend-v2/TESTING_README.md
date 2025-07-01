# Frontend Testing Infrastructure

This document describes the testing setup and infrastructure for the frontend-v2 application.

## Setup Summary

### What was configured:

1. **Jest Configuration** (`jest.config.js`)
   - Next.js integration with `next/jest`
   - JSDOM test environment for React components
   - Module path mapping for `@/` aliases
   - Coverage collection and thresholds
   - Test file patterns and exclusions

2. **Jest Setup** (`jest.setup.js`)
   - `@testing-library/jest-dom` matchers
   - Polyfills for TextEncoder/TextDecoder (for MSW)
   - Mocks for Next.js router and navigation
   - Global mocks for ResizeObserver, IntersectionObserver, matchMedia
   - localStorage and sessionStorage mocks
   - Console error filtering for test cleanup

3. **Dependencies Added**
   - `jest@^29.7.0` - Testing framework
   - `jest-environment-jsdom@^29.7.0` - DOM environment for React testing
   - `@testing-library/jest-dom@^6.6.3` - Additional Jest matchers
   - `jest-watch-typeahead@^2.2.2` - Enhanced test watching
   - `whatwg-fetch@^3.6.20` - Fetch polyfill
   - `next-router-mock@^0.9.13` - Next.js router mocking

4. **NPM Scripts Added**
   - `npm test` - Run all tests
   - `npm run test:watch` - Run tests in watch mode
   - `npm run test:coverage` - Run tests with coverage report

## Test Files Created

### Component Tests

#### 1. Button Component (`__tests__/Button.test.tsx`)
Tests for the `@/components/ui/Button` component:
- ✅ Renders with default props and variants
- ✅ Handles different sizes (xs, sm, md, lg, xl)
- ✅ Click event handling
- ✅ Loading state with spinner
- ✅ Disabled state behavior
- ✅ Icon rendering (left and right)
- ✅ Full width styling
- ✅ Ref forwarding
- ✅ Keyboard navigation
- ✅ Accessibility attributes
- ✅ Custom className handling

#### 2. Card Component (`__tests__/Card.test.tsx`)
Tests for all Card-related components:
- ✅ Card variants (default, elevated, glass, premium, etc.)
- ✅ Padding sizes (none, xs, sm, md, lg, xl)
- ✅ Interactive behavior
- ✅ Background patterns (dots, grid, waves)
- ✅ Animation delays
- ✅ CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- ✅ Full card integration test

#### 3. Login Page (`__tests__/LoginPage.test.tsx`)
Tests for the login page functionality:
- ✅ Form rendering and structure
- ✅ Success messages (registration, password reset)
- ✅ Form submission with API integration
- ✅ Field validation
- ✅ Message dismissal
- ✅ Accessibility structure
- ✅ Navigation link verification

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (automatically re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test files
npm test Button.test.tsx
npm test -- --testNamePattern="renders with default props"

# Run tests in verbose mode
npm test -- --verbose
```

## Test Patterns and Best Practices

### 1. Component Testing
- Test component rendering with different props
- Test user interactions (clicks, form submission)
- Test accessibility features
- Test error states and edge cases
- Use descriptive test names

### 2. Mocking Strategy
- Mock external dependencies (APIs, complex components)
- Mock Next.js specific features (router, navigation)
- Avoid mocking the component under test
- Use minimal mocks that maintain component behavior

### 3. Test Organization
```
__tests__/
├── Button.test.tsx          # UI component tests
├── Card.test.tsx           # UI component tests  
├── LoginPage.test.tsx      # Page component tests
└── component.test.template.tsx  # Template for new tests
```

### 4. Accessibility Testing
- Test for proper ARIA labels and roles
- Test keyboard navigation
- Test form associations (labels with inputs)
- Test heading hierarchy

## Coverage Goals

Current coverage thresholds:
- Branches: 50%
- Functions: 50%
- Lines: 50%
- Statements: 50%

Coverage is collected from:
- `components/**/*.{js,jsx,ts,tsx}`
- `app/**/*.{js,jsx,ts,tsx}`
- `lib/**/*.{js,jsx,ts,tsx}`

## Extending the Test Suite

### Adding Component Tests

1. Create a new test file in `__tests__/ComponentName.test.tsx`
2. Follow the pattern from existing tests
3. Import the component and testing utilities
4. Write tests for:
   - Basic rendering
   - Props variations
   - User interactions
   - Error states
   - Accessibility

### Adding Page Tests

1. Page tests require more mocking due to dependencies
2. Mock complex dependencies and focus on page-specific logic
3. Test routing and navigation
4. Test form submissions and API calls
5. Test success/error states

### Example Test Structure

```typescript
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { YourComponent } from '@/components/YourComponent'

describe('YourComponent', () => {
  it('renders correctly', () => {
    render(<YourComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  it('handles user interaction', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()
    
    render(<YourComponent onClick={handleClick} />)
    await user.click(screen.getByRole('button'))
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

## Next Steps

To expand the testing infrastructure:

1. **Add more component tests** for remaining UI components
2. **Add integration tests** for complex user flows
3. **Add API testing** with MSW (Mock Service Worker) for more realistic API interactions
4. **Add visual regression tests** with tools like Chromatic or Percy
5. **Add E2E tests** with Playwright (already installed)
6. **Increase coverage thresholds** as more tests are added

## Troubleshooting

### Common Issues

1. **Module resolution errors**: Check `moduleNameMapper` in `jest.config.js`
2. **Theme provider errors**: Mock theme-dependent components
3. **Next.js specific errors**: Use proper mocks in `jest.setup.js`
4. **Async operation errors**: Use `waitFor` for async operations
5. **DOM environment errors**: Ensure `testEnvironment: 'jsdom'` is set

### Debugging Tests

```bash
# Run with debug information
npm test -- --verbose --no-cache

# Run a single test file
npm test Button.test.tsx

# Run with coverage to see what's not tested
npm run test:coverage
```

The testing infrastructure is now ready for continuous development and expansion as the application grows.