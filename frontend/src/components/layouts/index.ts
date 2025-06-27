/**
 * Layout Components Export Index
 *
 * This file exports all layout-related components for the global sidebar system.
 * Import these components to create consistent layouts throughout the application.
 */

export { default as ConditionalLayout, useLayoutContext, withConditionalLayout } from './ConditionalLayout'
export { default as DashboardLayout } from './DashboardLayout'

// Type exports for better TypeScript integration
export type { ConditionalLayoutProps } from './ConditionalLayout'
export type { DashboardLayoutProps } from './DashboardLayout'

// Re-export the route classification utilities for convenience
export {
  isDashboardRoute,
  isPublicRoute,
  shouldShowSidebar,
  getRouteType,
  getDashboardRoutes,
  getPublicRoutes,
  ROUTE_PATTERNS
} from '@/utils/routeClassification'
