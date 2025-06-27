/**
 * Simple syntax and import test for layout components
 * This file just imports and exports our components to verify they're syntactically correct
 */

import ConditionalLayout, { useLayoutContext, withConditionalLayout } from '../ConditionalLayout'
import DashboardLayout from '../DashboardLayout'

// Test basic imports
export {
  ConditionalLayout,
  DashboardLayout,
  useLayoutContext,
  withConditionalLayout
}

// Test that components can be instantiated (syntax check)
const TestComponent = () => {
  return null
}

// Test HOC usage
const WrappedComponent = withConditionalLayout(TestComponent)

// Test hook usage (this will be called in a component context)
export function useLayoutTest() {
  const layoutContext = useLayoutContext()
  return layoutContext
}

// Export wrapped component for testing
export { WrappedComponent }
