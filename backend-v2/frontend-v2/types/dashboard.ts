/**
 * Dashboard TypeScript Types
 * 
 * Consolidated type definitions for the BookedBarber V2 dashboard system
 * including data structures, permissions, and component interfaces
 */

// Re-export role types from roleUtils for convenience
export type {
  UnifiedUserRole,
  LegacyRole,
  LegacyUserType,
  DashboardType,
  UserWithRole,
  PermissionCategory,
  PermissionLevel
} from '@/lib/roleUtils'

// Re-export dashboard data types from API module
export type {
  ClientPortalData,
  IndividualBarberData,
  ShopOwnerData,
  EnterpriseData,
  AdminData
} from '@/lib/api/dashboards'

// =============================================================================
// DASHBOARD COMPONENT PROPS
// =============================================================================

/**
 * Base props that all dashboard components should accept
 */
export interface BaseDashboardProps {
  user: UserWithRole
  className?: string
  refreshInterval?: number
  onError?: (error: Error) => void
  onDataLoad?: (data: unknown) => void
}

/**
 * Props for ClientPortal component
 */
export interface ClientPortalProps extends BaseDashboardProps {
  showLoyaltyProgram?: boolean
  maxUpcomingAppointments?: number
  maxRecentAppointments?: number
}

/**
 * Props for IndividualBarberDashboard component
 */
export interface IndividualBarberDashboardProps extends BaseDashboardProps {
  showGoals?: boolean
  show6FBScore?: boolean
  defaultTimeRange?: '7d' | '30d' | '90d'
}

/**
 * Props for ShopOwnerDashboard component
 */
export interface ShopOwnerDashboardProps extends BaseDashboardProps {
  organizationId?: number
  showStaffPerformance?: boolean
  showFinancialMetrics?: boolean
}

/**
 * Props for EnterpriseDashboard component
 */
export interface EnterpriseDashboardProps extends BaseDashboardProps {
  showExpansionOpportunities?: boolean
  showCrossLocationMetrics?: boolean
  defaultLocationView?: 'grid' | 'list' | 'map'
}

/**
 * Props for DashboardRouter component
 */
export interface DashboardRouterProps extends BaseDashboardProps {
  fallbackComponent?: React.ComponentType<Record<string, unknown>>
  enableErrorBoundary?: boolean
  loadingComponent?: React.ComponentType
}

// =============================================================================
// DASHBOARD DATA STRUCTURES
// =============================================================================

/**
 * Common appointment interface used across dashboards
 */
export interface DashboardAppointment {
  id: number
  service_name: string
  start_time: string
  end_time: string
  barber_name?: string
  barbershop_name?: string
  client_name?: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  can_reschedule: boolean
  can_cancel: boolean
  revenue?: number
  duration_minutes?: number
}

/**
 * Common metrics interface for business dashboards
 */
export interface BusinessMetrics {
  revenue: {
    daily: number
    weekly: number
    monthly: number
    yearly: number
  }
  growth: {
    daily_percent: number
    weekly_percent: number
    monthly_percent: number
    yearly_percent: number
  }
  appointments: {
    total: number
    completed: number
    cancelled: number
    no_shows: number
    completion_rate: number
  }
  clients: {
    total: number
    new_this_month: number
    returning: number
    retention_rate: number
  }
  performance: {
    utilization_rate: number
    average_ticket: number
    customer_satisfaction: number
  }
}

/**
 * Staff member interface for management dashboards
 */
export interface StaffMember {
  id: number
  name: string
  email: string
  role: string
  status: 'active' | 'inactive' | 'on_break' | 'off'
  performance: {
    appointments_today: number
    revenue_today: number
    utilization_rate: number
    customer_rating: number
    goals_met: number
    goals_total: number
  }
  schedule: {
    hours_scheduled: number
    hours_worked: number
    next_appointment?: DashboardAppointment
  }
}

/**
 * Location interface for enterprise dashboards
 */
export interface Location {
  id: number
  name: string
  address: string
  city: string
  state: string
  zip_code: string
  phone: string
  status: 'active' | 'inactive' | 'maintenance' | 'opening_soon'
  manager: {
    id: number
    name: string
    email: string
  }
  metrics: BusinessMetrics
  staff_count: number
  capacity: {
    chairs: number
    max_daily_appointments: number
  }
}

// =============================================================================
// DASHBOARD WIDGET TYPES
// =============================================================================

/**
 * Widget configuration for customizable dashboards
 */
export interface DashboardWidget {
  id: string
  type: 'metric' | 'chart' | 'list' | 'calendar' | 'table' | 'custom'
  title: string
  size: 'small' | 'medium' | 'large' | 'full-width'
  position: {
    row: number
    col: number
    width: number
    height: number
  }
  config: Record<string, unknown>
  permissions: PermissionCategory[]
  refreshInterval?: number
  isVisible: boolean
  isEnabled: boolean
}

/**
 * Dashboard layout configuration
 */
export interface DashboardLayout {
  id: string
  name: string
  description?: string
  role: UnifiedUserRole
  widgets: DashboardWidget[]
  settings: {
    refreshInterval: number
    theme: 'light' | 'dark' | 'auto'
    density: 'compact' | 'comfortable' | 'spacious'
    showHeader: boolean
    showSidebar: boolean
  }
}

// =============================================================================
// ANALYTICS AND REPORTING TYPES
// =============================================================================

/**
 * Time range options for analytics
 */
export type TimeRange = '1d' | '7d' | '30d' | '90d' | '1y' | 'custom'

/**
 * Chart data structure
 */
export interface ChartData {
  labels: string[]
  datasets: Array<{
    label: string
    data: number[]
    backgroundColor?: string | string[]
    borderColor?: string | string[]
    borderWidth?: number
  }>
}

/**
 * Analytics query parameters
 */
export interface AnalyticsQuery {
  timeRange: TimeRange
  startDate?: string
  endDate?: string
  groupBy?: 'hour' | 'day' | 'week' | 'month'
  filters?: {
    locationIds?: number[]
    staffIds?: number[]
    serviceIds?: number[]
    clientIds?: number[]
  }
  metrics: string[]
}

/**
 * Export options for dashboard data
 */
export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf' | 'json'
  timeRange: TimeRange
  includeCharts?: boolean
  includeRawData?: boolean
  sections: string[]
  customFields?: string[]
}

// =============================================================================
// PERMISSION AND ACCESS CONTROL TYPES
// =============================================================================

/**
 * Feature access configuration
 */
export interface FeatureAccess {
  feature: string
  roles: UnifiedUserRole[]
  permissions: PermissionLevel
  conditions?: {
    organizationId?: number
    subscriptionTier?: string
    trialStatus?: boolean
  }
}

/**
 * Dashboard access control
 */
export interface DashboardAccess {
  canView: boolean
  canEdit: boolean
  canExport: boolean
  canShare: boolean
  restrictions: {
    dateRange?: TimeRange
    locationIds?: number[]
    staffIds?: number[]
    sensitiveData?: boolean
  }
}

// =============================================================================
// NOTIFICATION AND ALERT TYPES
// =============================================================================

/**
 * Dashboard notification/alert
 */
export interface DashboardAlert {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  timestamp: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  isRead: boolean
  actions?: Array<{
    label: string
    action: string
    url?: string
  }>
  expiresAt?: string
}

/**
 * Real-time update types
 */
export interface DashboardUpdate {
  type: 'appointment' | 'payment' | 'staff' | 'metric' | 'alert'
  action: 'created' | 'updated' | 'deleted' | 'completed'
  data: unknown
  timestamp: string
  affectedUsers: number[]
}

// =============================================================================
// DASHBOARD STATE MANAGEMENT TYPES
// =============================================================================

/**
 * Dashboard loading states
 */
export interface DashboardLoadingState {
  isLoading: boolean
  isRefreshing: boolean
  lastUpdated?: string
  error?: string
  retryCount: number
  progress?: number
}

/**
 * Dashboard preferences
 */
export interface DashboardPreferences {
  userId: number
  defaultView: DashboardType
  refreshInterval: number
  enableNotifications: boolean
  enableSounds: boolean
  theme: 'light' | 'dark' | 'auto'
  timezone: string
  dateFormat: string
  currencyFormat: string
  language: string
  widgetSettings: Record<string, unknown>
  hiddenSections: string[]
}

/**
 * Dashboard context type for React context
 */
export interface DashboardContextType {
  user: UserWithRole
  dashboardType: DashboardType
  preferences: DashboardPreferences
  alerts: DashboardAlert[]
  loadingState: DashboardLoadingState
  permissions: DashboardAccess
  refreshData: () => Promise<void>
  updatePreferences: (preferences: Partial<DashboardPreferences>) => void
  dismissAlert: (alertId: string) => void
  exportData: (options: ExportOptions) => Promise<Blob>
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Standard API response wrapper
 */
export interface DashboardApiResponse<T = unknown> {
  data: T
  meta: {
    timestamp: string
    version: string
    requestId: string
    cached: boolean
    cacheExpires?: string
  }
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  errors?: Array<{
    code: string
    message: string
    field?: string
  }>
}

/**
 * Bulk dashboard data response
 */
export interface BulkDashboardData {
  user: UserWithRole
  dashboardData: ClientPortalData | IndividualBarberData | ShopOwnerData | EnterpriseData | AdminData
  preferences: DashboardPreferences
  alerts: DashboardAlert[]
  layout?: DashboardLayout
  permissions: DashboardAccess
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Make all properties of T optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * Extract dashboard data type based on dashboard type
 */
export type DashboardDataType<T extends DashboardType> = 
  T extends 'client-portal' ? ClientPortalData :
  T extends 'individual-barber' ? IndividualBarberData :
  T extends 'shop-owner' ? ShopOwnerData :
  T extends 'enterprise' ? EnterpriseData :
  T extends 'admin' ? AdminData :
  never

/**
 * Component props based on dashboard type
 */
export type DashboardComponentProps<T extends DashboardType> = 
  T extends 'client-portal' ? ClientPortalProps :
  T extends 'individual-barber' ? IndividualBarberDashboardProps :
  T extends 'shop-owner' ? ShopOwnerDashboardProps :
  T extends 'enterprise' ? EnterpriseDashboardProps :
  BaseDashboardProps