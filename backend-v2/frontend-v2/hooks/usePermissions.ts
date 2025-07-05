import { useAuth } from '@/hooks/useAuth'
import { useMemo } from 'react'

// Permission enum matching backend
export enum Permission {
  // Appointment permissions
  VIEW_OWN_APPOINTMENTS = "view_own_appointments",
  VIEW_ALL_APPOINTMENTS = "view_all_appointments",
  CREATE_APPOINTMENTS = "create_appointments",
  UPDATE_APPOINTMENTS = "update_appointments",
  DELETE_APPOINTMENTS = "delete_appointments",
  
  // Client permissions
  VIEW_OWN_CLIENT_INFO = "view_own_client_info",
  VIEW_ALL_CLIENTS = "view_all_clients",
  CREATE_CLIENTS = "create_clients",
  UPDATE_CLIENTS = "update_clients",
  DELETE_CLIENTS = "delete_clients",
  
  // Staff management permissions
  VIEW_STAFF = "view_staff",
  INVITE_STAFF = "invite_staff",
  MANAGE_STAFF = "manage_staff",
  DELETE_STAFF = "delete_staff",
  
  // Billing permissions
  VIEW_BILLING = "view_billing",
  MANAGE_BILLING = "manage_billing",
  UPDATE_SUBSCRIPTION = "update_subscription",
  CANCEL_SUBSCRIPTION = "cancel_subscription",
  
  // Analytics permissions
  VIEW_BASIC_ANALYTICS = "view_basic_analytics",
  VIEW_ADVANCED_ANALYTICS = "view_advanced_analytics",
  VIEW_FINANCIAL_ANALYTICS = "view_financial_analytics",
  EXPORT_ANALYTICS = "export_analytics",
  
  // Service management
  VIEW_SERVICES = "view_services",
  CREATE_SERVICES = "create_services",
  UPDATE_SERVICES = "update_services",
  DELETE_SERVICES = "delete_services",
  
  // Marketing permissions
  VIEW_MARKETING = "view_marketing",
  CREATE_CAMPAIGNS = "create_campaigns",
  SEND_MARKETING = "send_marketing",
  MANAGE_CONTACTS = "manage_contacts",
  
  // Settings permissions
  VIEW_SETTINGS = "view_settings",
  UPDATE_SETTINGS = "update_settings",
  MANAGE_INTEGRATIONS = "manage_integrations",
  
  // Organization permissions
  VIEW_ORGANIZATION = "view_organization",
  UPDATE_ORGANIZATION = "update_organization",
  DELETE_ORGANIZATION = "delete_organization",
  MANAGE_LOCATIONS = "manage_locations",
  
  // System admin permissions
  SYSTEM_ADMIN = "system_admin",
  VIEW_ALL_ORGANIZATIONS = "view_all_organizations",
  IMPERSONATE_USERS = "impersonate_users",
  MANAGE_PLATFORM = "manage_platform",
}

// Role permission mapping
const ROLE_PERMISSIONS: Record<string, Set<Permission>> = {
  // Platform roles
  super_admin: new Set(Object.values(Permission)), // All permissions
  
  platform_admin: new Set([
    Permission.SYSTEM_ADMIN,
    Permission.VIEW_ALL_ORGANIZATIONS,
    Permission.MANAGE_PLATFORM,
    Permission.VIEW_FINANCIAL_ANALYTICS,
    Permission.EXPORT_ANALYTICS,
  ]),
  
  // Business owner roles
  enterprise_owner: new Set([
    Permission.VIEW_ALL_APPOINTMENTS,
    Permission.CREATE_APPOINTMENTS,
    Permission.UPDATE_APPOINTMENTS,
    Permission.DELETE_APPOINTMENTS,
    Permission.VIEW_ALL_CLIENTS,
    Permission.CREATE_CLIENTS,
    Permission.UPDATE_CLIENTS,
    Permission.DELETE_CLIENTS,
    Permission.VIEW_STAFF,
    Permission.INVITE_STAFF,
    Permission.MANAGE_STAFF,
    Permission.DELETE_STAFF,
    Permission.VIEW_BILLING,
    Permission.MANAGE_BILLING,
    Permission.UPDATE_SUBSCRIPTION,
    Permission.CANCEL_SUBSCRIPTION,
    Permission.VIEW_BASIC_ANALYTICS,
    Permission.VIEW_ADVANCED_ANALYTICS,
    Permission.VIEW_FINANCIAL_ANALYTICS,
    Permission.EXPORT_ANALYTICS,
    Permission.VIEW_SERVICES,
    Permission.CREATE_SERVICES,
    Permission.UPDATE_SERVICES,
    Permission.DELETE_SERVICES,
    Permission.VIEW_MARKETING,
    Permission.CREATE_CAMPAIGNS,
    Permission.SEND_MARKETING,
    Permission.MANAGE_CONTACTS,
    Permission.VIEW_SETTINGS,
    Permission.UPDATE_SETTINGS,
    Permission.MANAGE_INTEGRATIONS,
    Permission.VIEW_ORGANIZATION,
    Permission.UPDATE_ORGANIZATION,
    Permission.DELETE_ORGANIZATION,
    Permission.MANAGE_LOCATIONS,
    Permission.VIEW_ALL_ORGANIZATIONS,
  ]),
  
  shop_owner: new Set([
    Permission.VIEW_ALL_APPOINTMENTS,
    Permission.CREATE_APPOINTMENTS,
    Permission.UPDATE_APPOINTMENTS,
    Permission.DELETE_APPOINTMENTS,
    Permission.VIEW_ALL_CLIENTS,
    Permission.CREATE_CLIENTS,
    Permission.UPDATE_CLIENTS,
    Permission.DELETE_CLIENTS,
    Permission.VIEW_STAFF,
    Permission.INVITE_STAFF,
    Permission.MANAGE_STAFF,
    Permission.DELETE_STAFF,
    Permission.VIEW_BILLING,
    Permission.MANAGE_BILLING,
    Permission.UPDATE_SUBSCRIPTION,
    Permission.CANCEL_SUBSCRIPTION,
    Permission.VIEW_BASIC_ANALYTICS,
    Permission.VIEW_ADVANCED_ANALYTICS,
    Permission.VIEW_FINANCIAL_ANALYTICS,
    Permission.EXPORT_ANALYTICS,
    Permission.VIEW_SERVICES,
    Permission.CREATE_SERVICES,
    Permission.UPDATE_SERVICES,
    Permission.DELETE_SERVICES,
    Permission.VIEW_MARKETING,
    Permission.CREATE_CAMPAIGNS,
    Permission.SEND_MARKETING,
    Permission.MANAGE_CONTACTS,
    Permission.VIEW_SETTINGS,
    Permission.UPDATE_SETTINGS,
    Permission.MANAGE_INTEGRATIONS,
    Permission.VIEW_ORGANIZATION,
    Permission.UPDATE_ORGANIZATION,
  ]),
  
  individual_barber: new Set([
    Permission.VIEW_ALL_APPOINTMENTS,
    Permission.CREATE_APPOINTMENTS,
    Permission.UPDATE_APPOINTMENTS,
    Permission.DELETE_APPOINTMENTS,
    Permission.VIEW_ALL_CLIENTS,
    Permission.CREATE_CLIENTS,
    Permission.UPDATE_CLIENTS,
    Permission.VIEW_BILLING,
    Permission.UPDATE_SUBSCRIPTION,
    Permission.VIEW_BASIC_ANALYTICS,
    Permission.VIEW_FINANCIAL_ANALYTICS,
    Permission.VIEW_SERVICES,
    Permission.CREATE_SERVICES,
    Permission.UPDATE_SERVICES,
    Permission.VIEW_SETTINGS,
    Permission.UPDATE_SETTINGS,
    Permission.MANAGE_INTEGRATIONS,
  ]),
  
  // Staff roles
  shop_manager: new Set([
    Permission.VIEW_ALL_APPOINTMENTS,
    Permission.CREATE_APPOINTMENTS,
    Permission.UPDATE_APPOINTMENTS,
    Permission.DELETE_APPOINTMENTS,
    Permission.VIEW_ALL_CLIENTS,
    Permission.CREATE_CLIENTS,
    Permission.UPDATE_CLIENTS,
    Permission.VIEW_STAFF,
    Permission.INVITE_STAFF,
    Permission.MANAGE_STAFF,
    Permission.VIEW_BASIC_ANALYTICS,
    Permission.VIEW_ADVANCED_ANALYTICS,
    Permission.VIEW_SERVICES,
    Permission.CREATE_SERVICES,
    Permission.UPDATE_SERVICES,
    Permission.VIEW_MARKETING,
    Permission.CREATE_CAMPAIGNS,
    Permission.VIEW_SETTINGS,
    Permission.UPDATE_SETTINGS,
    Permission.VIEW_ORGANIZATION,
  ]),
  
  barber: new Set([
    Permission.VIEW_OWN_APPOINTMENTS,
    Permission.CREATE_APPOINTMENTS,
    Permission.UPDATE_APPOINTMENTS,
    Permission.VIEW_ALL_CLIENTS,
    Permission.CREATE_CLIENTS,
    Permission.UPDATE_CLIENTS,
    Permission.VIEW_BASIC_ANALYTICS,
    Permission.VIEW_SERVICES,
    Permission.VIEW_SETTINGS,
  ]),
  
  receptionist: new Set([
    Permission.VIEW_ALL_APPOINTMENTS,
    Permission.CREATE_APPOINTMENTS,
    Permission.UPDATE_APPOINTMENTS,
    Permission.VIEW_ALL_CLIENTS,
    Permission.CREATE_CLIENTS,
    Permission.UPDATE_CLIENTS,
    Permission.VIEW_SERVICES,
    Permission.VIEW_SETTINGS,
  ]),
  
  // Client role
  client: new Set([
    Permission.VIEW_OWN_APPOINTMENTS,
    Permission.CREATE_APPOINTMENTS,
    Permission.UPDATE_APPOINTMENTS,
    Permission.VIEW_OWN_CLIENT_INFO,
    Permission.VIEW_SERVICES,
  ]),
  
  // Limited access
  viewer: new Set([
    Permission.VIEW_OWN_APPOINTMENTS,
    Permission.VIEW_OWN_CLIENT_INFO,
    Permission.VIEW_SERVICES,
  ]),
}

// Legacy role mapping (for backward compatibility)
const LEGACY_ROLE_MAPPING: Record<string, string> = {
  admin: 'shop_owner',
  super_admin: 'enterprise_owner',
  user: 'client',
}

export function usePermissions(organizationId?: number) {
  const { user, isAuthenticated } = useAuth()
  
  const permissions = useMemo(() => {
    if (!isAuthenticated || !user) {
      return new Set<Permission>()
    }
    
    // Get the unified role or map from legacy role
    const role = user.unified_role || LEGACY_ROLE_MAPPING[user.role] || user.role || 'client'
    
    // Get base permissions from role
    const basePermissions = ROLE_PERMISSIONS[role] || new Set<Permission>()
    
    // If user has organization-specific permissions, add them
    if (organizationId && user.organizations) {
      const userOrg = user.organizations.find(org => org.id === organizationId)
      if (userOrg) {
        const additionalPermissions = new Set(basePermissions)
        
        // Add organization-specific permissions
        if (userOrg.can_manage_billing) {
          additionalPermissions.add(Permission.VIEW_BILLING)
          additionalPermissions.add(Permission.MANAGE_BILLING)
          additionalPermissions.add(Permission.UPDATE_SUBSCRIPTION)
        }
        
        if (userOrg.can_manage_staff) {
          additionalPermissions.add(Permission.VIEW_STAFF)
          additionalPermissions.add(Permission.INVITE_STAFF)
          additionalPermissions.add(Permission.MANAGE_STAFF)
        }
        
        if (userOrg.can_view_analytics) {
          additionalPermissions.add(Permission.VIEW_BASIC_ANALYTICS)
        }
        
        return additionalPermissions
      }
    }
    
    return basePermissions
  }, [user, isAuthenticated, organizationId])
  
  const hasPermission = (permission: Permission): boolean => {
    return permissions.has(permission)
  }
  
  const hasAnyPermission = (perms: Permission[]): boolean => {
    return perms.some(p => permissions.has(p))
  }
  
  const hasAllPermissions = (perms: Permission[]): boolean => {
    return perms.every(p => permissions.has(p))
  }
  
  const requirePermission = (permission: Permission, message?: string): void => {
    if (!hasPermission(permission)) {
      throw new Error(message || 'You do not have permission to perform this action')
    }
  }
  
  const isBusinessOwner = (): boolean => {
    const ownerRoles = ['enterprise_owner', 'shop_owner', 'individual_barber']
    const role = user?.unified_role || LEGACY_ROLE_MAPPING[user?.role] || user?.role
    return ownerRoles.includes(role)
  }
  
  const isStaffMember = (): boolean => {
    const staffRoles = ['shop_manager', 'barber', 'receptionist']
    const role = user?.unified_role || LEGACY_ROLE_MAPPING[user?.role] || user?.role
    return staffRoles.includes(role)
  }
  
  const isSystemAdmin = (): boolean => {
    const adminRoles = ['super_admin', 'platform_admin']
    const role = user?.unified_role || LEGACY_ROLE_MAPPING[user?.role] || user?.role
    return adminRoles.includes(role)
  }
  
  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    requirePermission,
    isBusinessOwner,
    isStaffMember,
    isSystemAdmin,
    // Convenience checks
    canManageBilling: hasPermission(Permission.MANAGE_BILLING),
    canManageStaff: hasPermission(Permission.MANAGE_STAFF),
    canViewAnalytics: hasAnyPermission([
      Permission.VIEW_BASIC_ANALYTICS,
      Permission.VIEW_ADVANCED_ANALYTICS,
      Permission.VIEW_FINANCIAL_ANALYTICS
    ]),
    canManageServices: hasPermission(Permission.CREATE_SERVICES),
    canViewAllAppointments: hasPermission(Permission.VIEW_ALL_APPOINTMENTS),
    canViewAllClients: hasPermission(Permission.VIEW_ALL_CLIENTS),
  }
}