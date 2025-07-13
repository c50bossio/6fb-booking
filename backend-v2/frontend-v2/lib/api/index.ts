/**
 * API Module Exports
 * 
 * Central export point for all API modules
 */

// Export the main API client
export { apiClient, APIClient } from './client'

// Export essential API modules only
export * from './auth'
export * from './appointments'
export * from './payments'