/**
 * API Module Exports
 * 
 * Central export point for all API modules
 */

// Export the main API client
export { apiClient, APIClient } from './client'

// Export api alias for compatibility (multiple approaches)
export { apiClient as api } from './client'
export { api } from './api'