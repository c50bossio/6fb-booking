/**
 * Unified API Module Exports
 * 
 * Central export point for the new unified API client system
 */

// Core unified client
export { UnifiedAPIClient, apiClient, api } from './unified-client'

// Managers
export { RetryManager, withRetry, retryable } from './retry-manager'
export { AuthManager } from './auth-manager'
export { PerformanceMonitor, globalPerformanceMonitor } from './performance-monitor'

// Types
export * from './types/common'

// Domain-specific clients
export { UnifiedAuthClient, authClient } from './domains/auth-client-unified'

// For backward compatibility - re-export existing API modules
export * from './auth'
export * from './appointments'
export * from './services'
export * from './payments'
export * from './integrations'
export * from './analytics'
export * from './users'
export * from './clients'

// Legacy API client (for gradual migration)
export { apiClient as legacyApiClient, APIClient } from './client'

// Utility functions for migration
export const createStandardClient = () => UnifiedAPIClient.createStandard()
export const createCriticalClient = () => UnifiedAPIClient.createCritical()
export const createRealtimeClient = () => UnifiedAPIClient.createRealtime()
export const createAuthClient = () => UnifiedAPIClient.createAuth()

// Migration helpers
export const migrationHelpers = {
  /**
   * Get performance summary for migration validation
   */
  getPerformanceMetrics: () => globalPerformanceMonitor.getSummary(),
  
  /**
   * Log performance summary
   */
  logPerformanceSummary: () => globalPerformanceMonitor.logSummary(),
  
  /**
   * Clear performance metrics
   */
  clearMetrics: () => globalPerformanceMonitor.clearMetrics(),
  
  /**
   * Create a unified client with custom config
   */
  createCustomClient: (config: Partial<import('./types/common').APIClientConfig>) => new UnifiedAPIClient(config)
}