/**
 * Frontend permission checking utilities for unified role system.
 * 
 * This module provides role-based permission checking for React components,
 * ensuring consistency with backend permission logic.
 */

import { User, UnifiedUserRole } from './api'

/**
 * Role hierarchy levels for permission comparison
 */
const ROLE_HIERARCHY: Record<UnifiedUserRole, number> = {
  'super_admin': 100,
  'platform_admin': 90,
  'enterprise_owner': 80,
  'shop_owner': 70,
  'individual_barber': 60,
  'shop_manager': 50,
  'barber': 40,
  'receptionist': 30,
  'viewer': 20,
  'client': 10,
}

/**
 * Get numeric level for role comparison
 */
export function getRoleLevel(role: UnifiedUserRole): number {
  return ROLE_HIERARCHY[role] || 0
}

/**
 * Check if user role meets minimum requirement
 */
export function hasMinimumRole(userRole: UnifiedUserRole, requiredRole: UnifiedUserRole): boolean {
  const userLevel = getRoleLevel(userRole)
  const requiredLevel = getRoleLevel(requiredRole)
  return userLevel >= requiredLevel
}

/**
 * Permission checking functions that match backend logic
 */
export class UserPermissions {
  
  /**
   * Check if user owns any type of business
   */
  static isBusinessOwner(user: User): boolean {
    return ['enterprise_owner', 'shop_owner', 'individual_barber'].includes(user.unified_role)
  }
  
  /**
   * Check if user is staff (not owner, not client)
   */
  static isStaffMember(user: User): boolean {
    return ['shop_manager', 'barber', 'receptionist'].includes(user.unified_role)
  }
  
  /**
   * Check if user has system admin privileges
   */
  static isSystemAdmin(user: User): boolean {
    return ['super_admin', 'platform_admin'].includes(user.unified_role)
  }
  
  /**
   * Check if user can access billing features
   */
  static canManageBilling(user: User): boolean {
    return [
      'super_admin',
      'platform_admin', 
      'enterprise_owner',
      'shop_owner',
      'individual_barber'
    ].includes(user.unified_role)
  }
  
  /**
   * Check if user can manage staff members
   */
  static canManageStaff(user: User): boolean {
    return [
      'super_admin',
      'platform_admin',
      'enterprise_owner',
      'shop_owner',
      'shop_manager'
    ].includes(user.unified_role)
  }
  
  /**
   * Check if user can view analytics
   */
  static canViewAnalytics(user: User): boolean {
    return [
      'super_admin',
      'platform_admin',
      'enterprise_owner',
      'shop_owner',
      'individual_barber',
      'shop_manager',
      'barber'
    ].includes(user.unified_role)
  }
  
  /**
   * Check if user can manage organizations
   */
  static canManageOrganizations(user: User): boolean {
    return [
      'super_admin',
      'platform_admin',
      'enterprise_owner',
      'shop_owner'
    ].includes(user.unified_role)
  }
  
  /**
   * Check if user can book appointments
   */
  static canBookAppointments(user: User): boolean {
    return user.unified_role !== 'viewer' // Everyone except viewers can book
  }
  
  /**
   * Check if user can manage appointments
   */
  static canManageAppointments(user: User): boolean {
    return [
      'super_admin',
      'platform_admin',
      'enterprise_owner',
      'shop_owner',
      'individual_barber',
      'shop_manager',
      'barber',
      'receptionist'
    ].includes(user.unified_role)
  }
  
  /**
   * Check if user can process payments
   */
  static canProcessPayments(user: User): boolean {
    return [
      'super_admin',
      'platform_admin',
      'enterprise_owner',
      'shop_owner',
      'individual_barber',
      'shop_manager',
      'barber',
      'receptionist'
    ].includes(user.unified_role)
  }
  
  /**
   * Get business hierarchy level for chair-based billing
   */
  static getBusinessHierarchyLevel(user: User): 'individual' | 'studio' | 'enterprise' {
    const roleToLevel: Record<UnifiedUserRole, 'individual' | 'studio' | 'enterprise'> = {
      'individual_barber': 'individual',
      'shop_owner': 'studio', // Default, can be upgraded based on chair count
      'enterprise_owner': 'enterprise',
      'shop_manager': 'studio',
      'barber': 'studio',
      'receptionist': 'studio',
      'client': 'individual',
      'viewer': 'individual',
      'super_admin': 'enterprise',
      'platform_admin': 'enterprise'
    }
    return roleToLevel[user.unified_role] || 'individual'
  }
  
  /**
   * Get user-friendly role display name
   */
  static getRoleDisplayName(role: UnifiedUserRole): string {
    const displayNames: Record<UnifiedUserRole, string> = {
      'super_admin': 'Super Administrator',
      'platform_admin': 'Platform Admin',
      'enterprise_owner': 'Enterprise Owner',
      'shop_owner': 'Shop Owner',
      'individual_barber': 'Independent Barber',
      'shop_manager': 'Shop Manager',
      'barber': 'Barber',
      'receptionist': 'Receptionist',
      'client': 'Client',
      'viewer': 'Viewer'
    }
    return displayNames[role] || 'Unknown Role'
  }
  
  /**
   * Get role description for UI display
   */
  static getRoleDescription(role: UnifiedUserRole): string {
    const descriptions: Record<UnifiedUserRole, string> = {
      'super_admin': 'Full platform access and management',
      'platform_admin': 'Platform support and administration',
      'enterprise_owner': 'Multi-location business owner',
      'shop_owner': 'Single barbershop owner and operator',
      'individual_barber': 'Independent barber with personal practice',
      'shop_manager': 'Shop operations and staff management',
      'barber': 'Professional barber providing services',
      'receptionist': 'Front desk and appointment management',
      'client': 'Customer booking appointments',
      'viewer': 'Read-only access for reporting'
    }
    return descriptions[role] || 'Unknown role'
  }
}

/**
 * Enhanced User object with computed permission properties
 */
export function enhanceUserWithPermissions(user: User): User {
  return {
    ...user,
    is_business_owner: UserPermissions.isBusinessOwner(user),
    is_staff_member: UserPermissions.isStaffMember(user),
    is_system_admin: UserPermissions.isSystemAdmin(user),
    can_manage_billing: UserPermissions.canManageBilling(user),
    can_manage_staff: UserPermissions.canManageStaff(user),
    can_view_analytics: UserPermissions.canViewAnalytics(user)
  }
}

/**
 * Migration helpers for frontend components
 */
export class RoleMigrationHelper {
  
  /**
   * Get effective role for user (unified_role if available, fallback to legacy mapping)
   */
  static getEffectiveRole(user: User): UnifiedUserRole {
    // If user has been migrated, use unified_role
    if (user.role_migrated && user.unified_role) {
      return user.unified_role
    }
    
    // Fallback to legacy role mapping
    return this.mapLegacyRole(user.role, user.user_type)
  }
  
  /**
   * Map legacy role/user_type combination to unified role
   */
  static mapLegacyRole(role?: string, userType?: string): UnifiedUserRole {
    // Admin roles
    if (role === 'admin') {
      return 'super_admin'
    }
    
    // Business owner roles
    if (role === 'barber' && userType === 'barbershop') {
      return 'shop_owner'
    }
    if (role === 'user' && userType === 'barbershop') {
      return 'shop_owner'
    }
    
    // Individual barber roles
    if (role === 'barber' && userType === 'barber') {
      return 'individual_barber'
    }
    if (role === 'user' && userType === 'barber') {
      return 'individual_barber'
    }
    
    // Staff barber roles
    if (role === 'barber' && userType === 'client') {
      return 'barber'
    }
    
    // Default to client
    return 'client'
  }
}

/**
 * React hook for role-based conditional rendering
 */
export function useRoleCheck() {
  return {
    hasMinimumRole,
    getRoleLevel,
    UserPermissions,
    enhanceUserWithPermissions,
    RoleMigrationHelper
  }
}

/**
 * Higher-order component for role-based access control
 */
export function withRoleGuard<T extends object>(
  Component: React.ComponentType<T>,
  requiredPermission: (user: User) => boolean,
  fallbackComponent?: React.ComponentType
) {
  return function GuardedComponent(props: T & { user?: User }) {
    const { user, ...otherProps } = props
    
    if (!user) {
      return fallbackComponent ? React.createElement(fallbackComponent) : null
    }
    
    if (!requiredPermission(user)) {
      return fallbackComponent ? React.createElement(fallbackComponent) : null
    }
    
    return React.createElement(Component, otherProps as T)
  }
}