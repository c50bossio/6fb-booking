'use client'

import { useState } from 'react'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Permission } from '@/hooks/usePermissions'
import { UnifiedUserRole } from '@/lib/api'
import { UserPermissions } from '@/lib/permissions'

interface RolePermissionData {
  role: UnifiedUserRole
  permissions: string[]
  can_customize: boolean
  is_default: boolean
}

interface PermissionCategory {
  label: string
  description: string
  icon: string
  permissions: Permission[]
}

interface RolePermissionEditorProps {
  selectedRole: UnifiedUserRole
  onRoleChange: (role: UnifiedUserRole) => void
  rolePermissions: Record<UnifiedUserRole, RolePermissionData>
  onPermissionChange: (role: UnifiedUserRole, permission: Permission, granted: boolean) => void
  onResetRole: (role: UnifiedUserRole) => void
  permissionCategories: Record<string, PermissionCategory>
  corePermissions: Record<UnifiedUserRole, Set<Permission>>
}

export function RolePermissionEditor({
  selectedRole,
  onRoleChange,
  rolePermissions,
  onPermissionChange,
  onResetRole,
  permissionCategories,
  corePermissions
}: RolePermissionEditorProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['appointments', 'clients']))

  const roleData = rolePermissions[selectedRole]
  
  if (!roleData) {
    return (
      <Alert>
        <AlertDescription>
          Role data not found. Please refresh the page.
        </AlertDescription>
      </Alert>
    )
  }

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryKey)) {
        next.delete(categoryKey)
      } else {
        next.add(categoryKey)
      }
      return next
    })
  }

  const hasPermission = (permission: Permission): boolean => {
    return roleData.permissions.includes(permission as string)
  }

  const isPermissionCore = (permission: Permission): boolean => {
    return corePermissions[selectedRole]?.has(permission) || false
  }

  const canModifyPermission = (permission: Permission): boolean => {
    if (!roleData.can_customize) return false
    
    // Cannot disable core permissions
    if (hasPermission(permission) && isPermissionCore(permission)) {
      return false
    }
    
    return true
  }

  const getCategoryPermissionCount = (category: PermissionCategory) => {
    const total = category.permissions.length
    const granted = category.permissions.filter(p => hasPermission(p)).length
    const core = category.permissions.filter(p => isPermissionCore(p)).length
    
    return { total, granted, core }
  }

  const formatPermissionName = (permission: Permission): string => {
    return permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getPermissionDescription = (permission: Permission): string => {
    const descriptions: Record<Permission, string> = {
      [Permission.VIEW_OWN_APPOINTMENTS]: 'View appointments assigned to this user',
      [Permission.VIEW_ALL_APPOINTMENTS]: 'View all appointments in the organization',
      [Permission.CREATE_APPOINTMENTS]: 'Create new appointments for clients',
      [Permission.UPDATE_APPOINTMENTS]: 'Modify existing appointment details',
      [Permission.DELETE_APPOINTMENTS]: 'Cancel or delete appointments',
      [Permission.VIEW_OWN_CLIENT_INFO]: 'View personal client information',
      [Permission.VIEW_ALL_CLIENTS]: 'View all client records in the organization',
      [Permission.CREATE_CLIENTS]: 'Add new client records to the system',
      [Permission.UPDATE_CLIENTS]: 'Modify client information and details',
      [Permission.DELETE_CLIENTS]: 'Remove client records from the system',
      [Permission.VIEW_STAFF]: 'View staff member list and basic information',
      [Permission.INVITE_STAFF]: 'Send staff invitations to new team members',
      [Permission.MANAGE_STAFF]: 'Manage staff roles, settings, and permissions',
      [Permission.DELETE_STAFF]: 'Remove staff members from the organization',
      [Permission.VIEW_BILLING]: 'View billing information and payment history',
      [Permission.MANAGE_BILLING]: 'Manage billing settings and payment methods',
      [Permission.UPDATE_SUBSCRIPTION]: 'Modify subscription plans and features',
      [Permission.CANCEL_SUBSCRIPTION]: 'Cancel active subscriptions',
      [Permission.VIEW_BASIC_ANALYTICS]: 'View basic reports and key metrics',
      [Permission.VIEW_ADVANCED_ANALYTICS]: 'Access detailed analytics and insights',
      [Permission.VIEW_FINANCIAL_ANALYTICS]: 'View financial reports and revenue data',
      [Permission.EXPORT_ANALYTICS]: 'Export reports and data for external use',
      [Permission.VIEW_SERVICES]: 'View the service catalog and pricing',
      [Permission.CREATE_SERVICES]: 'Add new services to the catalog',
      [Permission.UPDATE_SERVICES]: 'Modify service details and pricing',
      [Permission.DELETE_SERVICES]: 'Remove services from the catalog',
      [Permission.VIEW_MARKETING]: 'View marketing campaigns and performance',
      [Permission.CREATE_CAMPAIGNS]: 'Create and design marketing campaigns',
      [Permission.SEND_MARKETING]: 'Send marketing messages to contacts',
      [Permission.MANAGE_CONTACTS]: 'Manage contact lists and segments',
      [Permission.VIEW_SETTINGS]: 'View organization settings and configuration',
      [Permission.UPDATE_SETTINGS]: 'Modify organization settings',
      [Permission.MANAGE_INTEGRATIONS]: 'Configure third-party integrations',
      [Permission.VIEW_ORGANIZATION]: 'View organization details and information',
      [Permission.UPDATE_ORGANIZATION]: 'Modify organization information and branding',
      [Permission.DELETE_ORGANIZATION]: 'Delete the organization (destructive)',
      [Permission.MANAGE_LOCATIONS]: 'Manage business locations and addresses',
      [Permission.SYSTEM_ADMIN]: 'Full platform administration and control',
      [Permission.VIEW_ALL_ORGANIZATIONS]: 'View all organizations on the platform',
      [Permission.IMPERSONATE_USERS]: 'Login as other users for support',
      [Permission.MANAGE_PLATFORM]: 'Manage platform-wide settings and features',
    }
    
    return descriptions[permission] || 'No description available'
  }

  // Get all available roles for selection
  const allRoles: UnifiedUserRole[] = [
    'super_admin', 'platform_admin', 'enterprise_owner', 'shop_owner',
    'individual_barber', 'shop_manager', 'barber', 'receptionist', 'client', 'viewer'
  ]

  return (
    <div className="space-y-6">
      {/* Role selector and info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Role Editor</span>
            <div className="flex items-center space-x-2">
              {!roleData.is_default && (
                <Badge variant="outline">Modified</Badge>
              )}
              {!roleData.can_customize && (
                <Badge variant="secondary">Fixed Permissions</Badge>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            Configure permissions for individual roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Role selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Role</label>
              <Select 
                value={selectedRole} 
                onChange={(value) => onRoleChange(value as UnifiedUserRole)}
                options={allRoles.map(role => ({
                  value: role,
                  label: `${UserPermissions.getRoleDisplayName(role)}${!rolePermissions[role]?.can_customize ? ' (Fixed)' : ''}`
                }))}
              />
            </div>

            {/* Role info */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium mb-2">{UserPermissions.getRoleDisplayName(selectedRole)}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {UserPermissions.getRoleDescription(selectedRole)}
              </p>
              <div className="flex items-center space-x-4 text-sm">
                <div>
                  <span className="font-medium">{roleData.permissions.length}</span> permissions granted
                </div>
                <div>
                  <span className="font-medium">
                    {Array.from(corePermissions[selectedRole] || []).length}
                  </span> core permissions
                </div>
                {roleData.can_customize ? (
                  <Badge variant="outline" className="text-xs">Customizable</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Fixed Role</Badge>
                )}
              </div>
            </div>

            {/* Action buttons */}
            {roleData.can_customize && (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => onResetRole(selectedRole)}
                  disabled={roleData.is_default}
                >
                  Reset to Default
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Customization warning */}
      {!roleData.can_customize && (
        <Alert>
          <AlertDescription>
            This role has fixed permissions that cannot be customized. These permissions are set by the system to ensure proper functionality and security.
          </AlertDescription>
        </Alert>
      )}

      {/* Permission categories */}
      <div className="space-y-4">
        {Object.entries(permissionCategories).map(([categoryKey, category]) => {
          const isExpanded = expandedCategories.has(categoryKey)
          const { total, granted, core } = getCategoryPermissionCount(category)
          
          return (
            <Card key={categoryKey}>
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => toggleCategory(categoryKey)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{category.icon}</span>
                    <div>
                      <CardTitle className="text-lg">{category.label}</CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {granted}/{total}
                    </Badge>
                    {core > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {core} core
                      </Badge>
                    )}
                    <Button variant="ghost" size="sm">
                      {isExpanded ? '−' : '+'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent>
                  <div className="space-y-3">
                    {category.permissions.map(permission => {
                      const hasPermissionValue = hasPermission(permission)
                      const isCore = isPermissionCore(permission)
                      const canModify = canModifyPermission(permission)
                      
                      return (
                        <div key={permission} className="flex items-start justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h5 className="font-medium text-sm">
                                {formatPermissionName(permission)}
                              </h5>
                              {isCore && (
                                <Badge variant="secondary" className="text-xs">
                                  Core
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {getPermissionDescription(permission)}
                            </p>
                            <p className="text-xs text-gray-400 mt-1 font-mono">
                              {permission}
                            </p>
                          </div>
                          <div className="ml-4">
                            <Switch
                              checked={hasPermissionValue}
                              onCheckedChange={(checked) => onPermissionChange(selectedRole, permission, checked)}
                              disabled={!canModify}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}