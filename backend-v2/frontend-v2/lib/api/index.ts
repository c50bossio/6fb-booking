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
export { catalogApi } from './catalog'

// Direct export for problematic function
export async function getServiceMetrics(serviceId?: number, dateRange?: { start: string; end: string }): Promise<any> {
  // Placeholder for service metrics - returns empty metrics for now
  return {
    total_bookings: 0,
    total_revenue: 0,
    average_rating: 0,
    repeat_customers: 0,
    popular_times: [],
    performance_trends: []
  }
}