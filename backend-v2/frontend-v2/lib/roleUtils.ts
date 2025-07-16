/**
 * Role-based utilities for BookedBarber V2
 * 
 * This module provides utilities for checking user roles and permissions
 * according to the unified role system defined in USER_ROLES_REFERENCE.md
 */

// Unified role types
export type UnifiedUserRole = 
  | 'super_admin'
  | 'platform_admin'
  | 'enterprise_owner'
  | 'shop_owner'
  | 'individual_barber'
  | 'shop_manager'
  | 'barber'
  | 'receptionist'
  | 'client'
  | 'viewer'

// Legacy role types (for backward compatibility during migration)
export type LegacyRole = 'admin' | 'barber' | 'user'
export type LegacyUserType = 'client' | 'barber' | 'barbershop'

// Dashboard types corresponding to each role
export type DashboardType = 
  | 'client-portal'
  | 'individual-barber'
  | 'shop-owner'
  | 'enterprise'
  | 'admin'

// User interface for role checking
export interface UserWithRole {
  id: number
  email?: string
  name?: string
  first_name?: string
  unified_role?: UnifiedUserRole
  role?: LegacyRole  // Deprecated, kept for backward compatibility
  user_type?: LegacyUserType  // Deprecated, kept for backward compatibility
  organization_id?: number
  primary_organization_id?: number
}

// Permission categories
export type PermissionCategory = 
  | 'organization_management'
  | 'billing_payments'
  | 'staff_management'
  | 'analytics_access'
  | 'booking_management'
  | 'client_data_access'
  | 'financial_reports'
  | 'system_settings'
  | 'marketing_services'

// Permission levels
export type PermissionLevel = 'none' | 'limited' | 'full'

/**
 * Get the unified role for a user, with fallback to legacy role mapping
 */
export function getUserUnifiedRole(user: UserWithRole): UnifiedUserRole {
  // If user has unified_role, use it
  if (user.unified_role) {
    return user.unified_role
  }

  // Fallback to legacy role mapping for users not yet migrated
  return mapLegacyToUnifiedRole(user.role, user.user_type)
}

/**
 * Map legacy role/user_type combination to unified role
 */
export function mapLegacyToUnifiedRole(
  role?: LegacyRole, 
  userType?: LegacyUserType
): UnifiedUserRole {
  // Legacy role mapping based on USER_ROLES_REFERENCE.md
  if (role === 'admin') {
    return 'super_admin'
  }
  
  if (role === 'barber') {
    if (userType === 'barbershop') {
      return 'shop_owner'
    }
    return 'barber'
  }
  
  if (role === 'user') {
    if (userType === 'client') {
      return 'client'
    }
    if (userType === 'barber') {
      return 'individual_barber'
    }
  }

  // Default fallback
  return 'client'
}

/**
 * Determine which dashboard type a user should see
 */
export function getDashboardType(user: UserWithRole): DashboardType {
  const unifiedRole = getUserUnifiedRole(user)

  switch (unifiedRole) {
    case 'client':
      return 'client-portal'
    
    case 'individual_barber':
      return 'individual-barber'
    
    case 'barber':
    case 'receptionist':
      return 'shop-owner'  // Staff see shop dashboard with limited permissions
    
    case 'shop_manager':
    case 'shop_owner':
      return 'shop-owner'
    
    case 'enterprise_owner':
      return 'enterprise'
    
    case 'super_admin':
    case 'platform_admin':
      return 'admin'
    
    case 'viewer':
      return 'client-portal'  // Viewers get basic portal
    
    default:
      return 'client-portal'
  }
}

/**
 * Check if a user has a specific permission level for a category
 */
export function hasPermission(
  user: UserWithRole,
  category: PermissionCategory,
  requiredLevel: PermissionLevel = 'limited'
): boolean {
  const userRole = getUserUnifiedRole(user)
  const userPermissionLevel = getPermissionLevel(userRole, category)
  
  if (requiredLevel === 'none') {
    return true
  }
  
  if (requiredLevel === 'limited') {
    return userPermissionLevel === 'limited' || userPermissionLevel === 'full'
  }
  
  if (requiredLevel === 'full') {
    return userPermissionLevel === 'full'
  }
  
  return false
}

/**
 * Get permission level for a specific role and category
 * Based on the permission matrix in USER_ROLES_REFERENCE.md
 */
export function getPermissionLevel(
  role: UnifiedUserRole,
  category: PermissionCategory
): PermissionLevel {
  const permissionMatrix: Record<UnifiedUserRole, Record<PermissionCategory, PermissionLevel>> = {
    client: {
      organization_management: 'none',
      billing_payments: 'none',
      staff_management: 'none',
      analytics_access: 'none',
      booking_management: 'limited',  // Own appointments only
      client_data_access: 'limited',  // Own profile only
      financial_reports: 'none',
      system_settings: 'limited',     // Personal settings only
      marketing_services: 'limited'   // View services only
    },
    
    barber: {
      organization_management: 'none',
      billing_payments: 'none',
      staff_management: 'none',
      analytics_access: 'limited',    // Personal metrics only
      booking_management: 'limited',  // Own appointments only
      client_data_access: 'limited',  // Shop clients only
      financial_reports: 'none',
      system_settings: 'limited',     // Personal settings
      marketing_services: 'limited'   // View services
    },
    
    individual_barber: {
      organization_management: 'limited',  // Own business only
      billing_payments: 'full',
      staff_management: 'none',
      analytics_access: 'full',       // Own business analytics
      booking_management: 'full',     // All own appointments
      client_data_access: 'full',     // All own clients
      financial_reports: 'full',      // Personal earnings
      system_settings: 'full',        // Business settings
      marketing_services: 'full'      // Manage own services
    },
    
    receptionist: {
      organization_management: 'none',
      billing_payments: 'none',
      staff_management: 'none',
      analytics_access: 'none',
      booking_management: 'full',     // All appointments at location
      client_data_access: 'limited',  // Contact info only
      financial_reports: 'none',
      system_settings: 'limited',     // Personal settings
      marketing_services: 'limited'   // View services
    },
    
    shop_manager: {
      organization_management: 'limited',  // Location operations only
      billing_payments: 'none',
      staff_management: 'limited',     // Shop staff only
      analytics_access: 'full',        // Location analytics
      booking_management: 'full',      // All location appointments
      client_data_access: 'full',      // All location clients
      financial_reports: 'none',
      system_settings: 'limited',      // Location settings
      marketing_services: 'full'       // Location marketing
    },
    
    shop_owner: {
      organization_management: 'limited',  // Own shop only
      billing_payments: 'full',
      staff_management: 'full',        // All shop staff
      analytics_access: 'full',        // Shop analytics
      booking_management: 'full',      // All shop appointments
      client_data_access: 'full',      // All shop clients
      financial_reports: 'full',       // Shop financial reports
      system_settings: 'full',         // Shop settings
      marketing_services: 'full'       // Shop marketing
    },
    
    enterprise_owner: {
      organization_management: 'full', // All owned locations
      billing_payments: 'full',
      staff_management: 'full',        // All enterprise staff
      analytics_access: 'full',        // Enterprise analytics
      booking_management: 'full',      // All enterprise appointments
      client_data_access: 'full',      // All enterprise clients
      financial_reports: 'full',       // Enterprise reports
      system_settings: 'full',         // Enterprise settings
      marketing_services: 'full'       // Enterprise marketing
    },
    
    platform_admin: {
      organization_management: 'limited',  // Support only
      billing_payments: 'limited',     // Support access
      staff_management: 'none',
      analytics_access: 'full',        // Platform analytics
      booking_management: 'none',
      client_data_access: 'limited',   // Support only
      financial_reports: 'full',       // Platform reports
      system_settings: 'full',         // Platform settings
      marketing_services: 'none'
    },
    
    super_admin: {
      organization_management: 'full',
      billing_payments: 'full',
      staff_management: 'full',
      analytics_access: 'full',
      booking_management: 'full',
      client_data_access: 'full',
      financial_reports: 'full',
      system_settings: 'full',
      marketing_services: 'full'
    },
    
    viewer: {
      organization_management: 'none',
      billing_payments: 'none',
      staff_management: 'none',
      analytics_access: 'none',
      booking_management: 'limited',   // View own only
      client_data_access: 'limited',   // Own profile only
      financial_reports: 'none',
      system_settings: 'none',
      marketing_services: 'limited'    // View services only
    }
  }

  return permissionMatrix[role]?.[category] || 'none'
}

/**
 * Check if user is a business owner (any level)
 */
export function isBusinessOwner(user: UserWithRole): boolean {
  const role = getUserUnifiedRole(user)
  return ['shop_owner', 'enterprise_owner', 'individual_barber'].includes(role)
}

/**
 * Check if user is staff (non-owner employee)
 */
export function isStaff(user: UserWithRole): boolean {
  const role = getUserUnifiedRole(user)
  return ['barber', 'receptionist', 'shop_manager'].includes(role)
}

/**
 * Check if user is a client (customer)
 */
export function isClient(user: UserWithRole): boolean {
  const role = getUserUnifiedRole(user)
  return role === 'client'
}

/**
 * Check if user is an admin (platform level)
 */
export function isAdmin(user: UserWithRole): boolean {
  const role = getUserUnifiedRole(user)
  return ['super_admin', 'platform_admin'].includes(role)
}

/**
 * Check if user can manage staff
 */
export function canManageStaff(user: UserWithRole): boolean {
  return hasPermission(user, 'staff_management', 'limited')
}

/**
 * Check if user can view financial reports
 */
export function canViewFinancials(user: UserWithRole): boolean {
  return hasPermission(user, 'financial_reports', 'limited')
}

/**
 * Check if user can manage organizations
 */
export function canManageOrganizations(user: UserWithRole): boolean {
  return hasPermission(user, 'organization_management', 'limited')
}

/**
 * Get user's data access scope
 */
export function getDataAccessScope(user: UserWithRole): 'personal' | 'location' | 'enterprise' | 'platform' {
  const role = getUserUnifiedRole(user)
  
  switch (role) {
    case 'client':
    case 'viewer':
      return 'personal'
    
    case 'individual_barber':
      return 'personal'  // Own business is personal scope
    
    case 'barber':
    case 'receptionist':
    case 'shop_manager':
    case 'shop_owner':
      return 'location'
    
    case 'enterprise_owner':
      return 'enterprise'
    
    case 'super_admin':
    case 'platform_admin':
      return 'platform'
    
    default:
      return 'personal'
  }
}

/**
 * Validate if user role transition is allowed
 */
export function canTransitionRole(
  currentRole: UnifiedUserRole, 
  newRole: UnifiedUserRole,
  authorizedBy: UnifiedUserRole
): boolean {
  // Super admin can change any role
  if (authorizedBy === 'super_admin') {
    return true
  }
  
  // Enterprise owners can manage roles within their enterprise
  if (authorizedBy === 'enterprise_owner') {
    const enterpriseRoles: UnifiedUserRole[] = [
      'shop_owner', 'shop_manager', 'barber', 'receptionist', 'client'
    ]
    return enterpriseRoles.includes(currentRole) && enterpriseRoles.includes(newRole)
  }
  
  // Shop owners can manage roles within their shop
  if (authorizedBy === 'shop_owner') {
    const shopRoles: UnifiedUserRole[] = ['shop_manager', 'barber', 'receptionist', 'client']
    return shopRoles.includes(currentRole) && shopRoles.includes(newRole)
  }
  
  // No other roles can change user roles
  return false
}

/**
 * Get role hierarchy level (higher number = more authority)
 */
export function getRoleHierarchyLevel(role: UnifiedUserRole): number {
  const hierarchy: Record<UnifiedUserRole, number> = {
    'super_admin': 100,
    'platform_admin': 90,
    'enterprise_owner': 80,
    'shop_owner': 70,
    'shop_manager': 60,
    'individual_barber': 50,
    'barber': 40,
    'receptionist': 30,
    'client': 20,
    'viewer': 10
  }
  
  return hierarchy[role] || 0
}