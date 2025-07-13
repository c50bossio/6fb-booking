/**
 * API Module Exports
 * 
 * Central export point for all API modules
 */

// Export the main API client
export { apiClient, APIClient } from './client'

// Export api alias for compatibility
export { apiClient as api } from './client'

// Export essential API modules only
export * from './auth'
export * from './appointments'
export * from './payments'