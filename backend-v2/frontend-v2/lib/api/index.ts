/**
 * API Module Exports
 * 
 * Central export point for all API modules
 */

// Export the main API client and alias directly
export { apiClient, APIClient, api } from './client'

// Export specific functions needed by components
export * from './catalog'
export * from './auth'
export * from './users' 
export * from './services'

// Export specific functions for compatibility
export { catalogApi, getServiceMetrics } from './catalog'