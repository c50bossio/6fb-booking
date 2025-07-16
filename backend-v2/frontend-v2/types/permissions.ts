/**
 * Permission System Types
 * 
 * Comprehensive type definitions for the BookedBarber V2 permission system
 * including role-based access control, feature permissions, and data scoping
 */

// Re-export core permission types from roleUtils
export type {
  UnifiedUserRole,
  PermissionCategory,
  PermissionLevel,
  UserWithRole
} from '@/lib/roleUtils'

// =============================================================================
// CORE PERMISSION TYPES
// =============================================================================

/**
 * Permission action types
 */
export type PermissionAction = 
  | 'create' 
  | 'read' 
  | 'update' 
  | 'delete' 
  | 'manage' 
  | 'view' 
  | 'export' 
  | 'import'
  | 'approve'
  | 'reject'
  | 'archive'
  | 'restore'

/**
 * Resource types that can have permissions
 */
export type PermissionResource = 
  | 'appointments'
  | 'clients' 
  | 'staff'
  | 'organizations'
  | 'payments'
  | 'reports'
  | 'analytics'
  | 'settings'
  | 'integrations'
  | 'marketing'
  | 'reviews'
  | 'services'
  | 'schedules'
  | 'notifications'
  | 'webhooks'
  | 'api_keys'
  | 'backups'
  | 'system'

/**
 * Data access scope levels
 */
export type DataScope = 
  | 'personal'      // Own data only
  | 'assigned'      // Assigned clients/appointments  
  | 'location'      // Location/shop level data
  | 'organization'  // Organization level data
  | 'enterprise'    // Enterprise level data
  | 'platform'      // Platform-wide data

/**
 * Condition types for conditional permissions
 */
export interface PermissionCondition {
  type: 'time' | 'location' | 'ownership' | 'subscription' | 'feature_flag' | 'custom'
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in'
  value: any
  field?: string
}

/**
 * Complete permission definition
 */
export interface Permission {
  id: string
  name: string
  description: string
  resource: PermissionResource
  action: PermissionAction
  scope: DataScope
  level: PermissionLevel
  conditions?: PermissionCondition[]
  dependencies?: string[] // Other permission IDs required
  excludes?: string[]     // Permissions that conflict with this one
}

// =============================================================================
// ROLE-BASED PERMISSIONS
// =============================================================================

/**
 * Role permission set
 */
export interface RolePermissions {
  role: UnifiedUserRole
  permissions: Permission[]
  inheritFrom?: UnifiedUserRole[] // Roles to inherit permissions from
  restrictions?: {
    maxLocations?: number
    maxStaff?: number
    maxClients?: number
    features?: string[]
  }
}

/**
 * Permission matrix entry
 */
export interface PermissionMatrixEntry {
  resource: PermissionResource
  action: PermissionAction
  roles: Record<UnifiedUserRole, PermissionLevel>
  conditions?: Record<UnifiedUserRole, PermissionCondition[]>
}

/**
 * Complete permission matrix
 */
export type PermissionMatrix = PermissionMatrixEntry[]

// =============================================================================
// FEATURE PERMISSIONS
// =============================================================================

/**
 * Feature flag configuration
 */
export interface FeatureFlag {
  id: string
  name: string
  description: string
  enabled: boolean
  rolloutPercentage: number
  targetRoles?: UnifiedUserRole[]
  targetOrganizations?: number[]
  targetUsers?: number[]
  conditions?: PermissionCondition[]
  startDate?: string
  endDate?: string
}

/**
 * Feature permission configuration
 */
export interface FeaturePermission {
  feature: string
  requiredPermissions: string[]
  requiredRole?: UnifiedUserRole
  requiredSubscription?: string
  trialAccess?: boolean
  betaAccess?: boolean
  deprecatedDate?: string
  replacedBy?: string
}

// =============================================================================
// SUBSCRIPTION-BASED PERMISSIONS
// =============================================================================

/**
 * Subscription tier definition
 */
export interface SubscriptionTier {
  id: string
  name: string
  description: string
  price: number
  billingPeriod: 'monthly' | 'yearly'
  features: string[]
  limits: {
    locations?: number
    staff?: number
    clients?: number
    appointments?: number
    storage?: number // in GB
    apiCalls?: number
  }
  permissions: string[]
}

/**
 * Trial limitations
 */
export interface TrialLimitations {
  duration: number // days
  features: string[]
  limits: {
    locations: number
    staff: number
    clients: number
    appointments: number
  }
  restrictions: string[]
}

// =============================================================================
// ORGANIZATION-LEVEL PERMISSIONS
// =============================================================================

/**
 * Organization permission settings
 */
export interface OrganizationPermissions {
  organizationId: number
  customPermissions: Permission[]
  roleOverrides: Record<UnifiedUserRole, Partial<RolePermissions>>
  featureFlags: Record<string, boolean>
  integrationAccess: {
    enabled: string[]
    disabled: string[]
    pending: string[]
  }
  dataRetention: {
    appointments: number // days
    payments: number
    analytics: number
    logs: number
  }
}

/**
 * User-organization permission relationship
 */
export interface UserOrganizationPermission {
  userId: number
  organizationId: number
  role: UnifiedUserRole
  customPermissions?: string[]
  restrictions?: {
    locationIds?: number[]
    departmentIds?: number[]
    scheduleAccess?: boolean
    financialAccess?: boolean
  }
  grantedBy: number
  grantedAt: string
  expiresAt?: string
}

// =============================================================================
// PERMISSION CHECKING UTILITIES
// =============================================================================

/**
 * Permission check request
 */
export interface PermissionCheckRequest {
  userId: number
  resource: PermissionResource
  action: PermissionAction
  context?: {
    organizationId?: number
    locationId?: number
    targetUserId?: number
    appointmentId?: number
    clientId?: number
    [key: string]: any
  }
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean
  reason?: string
  conditions?: PermissionCondition[]
  alternatives?: {
    action: PermissionAction
    resource: PermissionResource
    description: string
  }[]
  requiredRole?: UnifiedUserRole
  requiredPermissions?: string[]
}

/**
 * Bulk permission check request
 */
export interface BulkPermissionCheckRequest {
  userId: number
  checks: Array<{
    id: string
    resource: PermissionResource
    action: PermissionAction
    context?: Record<string, any>
  }>
}

/**
 * Bulk permission check result
 */
export interface BulkPermissionCheckResult {
  results: Record<string, PermissionCheckResult>
  summary: {
    total: number
    allowed: number
    denied: number
  }
}

// =============================================================================
// AUDIT AND LOGGING TYPES
// =============================================================================

/**
 * Permission audit log entry
 */
export interface PermissionAuditLog {
  id: string
  userId: number
  resource: PermissionResource
  action: PermissionAction
  result: 'allowed' | 'denied'
  reason?: string
  context: Record<string, any>
  ipAddress: string
  userAgent: string
  timestamp: string
  organizationId?: number
  locationId?: number
}

/**
 * Role change audit log
 */
export interface RoleChangeAuditLog {
  id: string
  targetUserId: number
  changedBy: number
  oldRole: UnifiedUserRole
  newRole: UnifiedUserRole
  reason: string
  organizationId?: number
  timestamp: string
  approved: boolean
  approvedBy?: number
  approvedAt?: string
}

// =============================================================================
// API TYPES
// =============================================================================

/**
 * Permission API response
 */
export interface PermissionApiResponse<T = any> {
  data: T
  permissions: {
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
    canExport: boolean
    canManage: boolean
  }
  meta: {
    role: UnifiedUserRole
    scope: DataScope
    organizationId?: number
    timestamp: string
  }
}

/**
 * Role management API request
 */
export interface RoleManagementRequest {
  targetUserId: number
  newRole: UnifiedUserRole
  organizationId?: number
  reason: string
  expiresAt?: string
  customPermissions?: string[]
  restrictions?: Record<string, any>
}

/**
 * Permission grant request
 */
export interface PermissionGrantRequest {
  targetUserId: number
  permissions: string[]
  organizationId?: number
  expiresAt?: string
  reason: string
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Permission helper for React components
 */
export interface PermissionHelpers {
  can: (action: PermissionAction, resource: PermissionResource, context?: any) => boolean
  canAny: (actions: PermissionAction[], resource: PermissionResource, context?: any) => boolean
  canAll: (actions: PermissionAction[], resource: PermissionResource, context?: any) => boolean
  hasRole: (role: UnifiedUserRole) => boolean
  hasAnyRole: (roles: UnifiedUserRole[]) => boolean
  getScope: () => DataScope
  getPermissions: () => Permission[]
  getRoleLevel: () => number
}

/**
 * Permission context for React
 */
export interface PermissionContextType {
  user: UserWithRole
  permissions: Permission[]
  helpers: PermissionHelpers
  loading: boolean
  error?: string
  refresh: () => Promise<void>
}

/**
 * Protected route configuration
 */
export interface ProtectedRouteConfig {
  path: string
  requiredRole?: UnifiedUserRole
  requiredPermissions?: string[]
  allowedRoles?: UnifiedUserRole[]
  requireAll?: boolean // If true, user must have ALL permissions/roles
  redirect?: string
  fallback?: React.ComponentType
}

/**
 * Permission-based component props
 */
export interface PermissionComponentProps {
  requiredPermission?: string
  requiredRole?: UnifiedUserRole
  requiredAction?: PermissionAction
  requiredResource?: PermissionResource
  fallback?: React.ReactNode
  loading?: React.ReactNode
  children: React.ReactNode
}