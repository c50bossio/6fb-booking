'use client'

import { useState } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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

interface RolePermissionMatrixProps {
  rolePermissions: Record<UnifiedUserRole, RolePermissionData>
  onPermissionChange: (role: UnifiedUserRole, permission: Permission, granted: boolean) => void
  onResetRole: (role: UnifiedUserRole) => void
  permissionCategories: Record<string, PermissionCategory>
  corePermissions: Record<UnifiedUserRole, Set<Permission>>
}

export function RolePermissionMatrix({
  rolePermissions,
  onPermissionChange,
  onResetRole,
  permissionCategories,
  corePermissions
}: RolePermissionMatrixProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all')
  const [showOnlyCustomizable, setShowOnlyCustomizable] = useState(false)

  // Get all roles and filter based on options
  const allRoles: UnifiedUserRole[] = [
    'super_admin', 'platform_admin', 'enterprise_owner', 'shop_owner',
    'individual_barber', 'shop_manager', 'barber', 'receptionist', 'client', 'viewer'
  ]

  const visibleRoles = allRoles.filter(role => {
    if (showOnlyCustomizable && !rolePermissions[role]?.can_customize) {
      return false
    }
    return true
  })

  // Get permissions for selected category
  const getVisiblePermissions = (): Permission[] => {
    if (selectedCategory === 'all') {
      return Object.values(Permission)
    }
    
    const category = permissionCategories[selectedCategory]
    return category ? category.permissions : []
  }

  const visiblePermissions = getVisiblePermissions()

  const formatPermissionName = (permission: Permission): string => {
    return permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getPermissionDescription = (permission: Permission): string => {
    const descriptions: Record<Permission, string> = {
      [Permission.VIEW_OWN_APPOINTMENTS]: 'View appointments assigned to user',
      [Permission.VIEW_ALL_APPOINTMENTS]: 'View all appointments in organization',
      [Permission.CREATE_APPOINTMENTS]: 'Create new appointments',
      [Permission.UPDATE_APPOINTMENTS]: 'Modify existing appointments',
      [Permission.DELETE_APPOINTMENTS]: 'Cancel or delete appointments',
      [Permission.VIEW_OWN_CLIENT_INFO]: 'View personal client information',
      [Permission.VIEW_ALL_CLIENTS]: 'View all client records',
      [Permission.CREATE_CLIENTS]: 'Add new client records',
      [Permission.UPDATE_CLIENTS]: 'Modify client information',
      [Permission.DELETE_CLIENTS]: 'Remove client records',
      [Permission.VIEW_STAFF]: 'View staff member list',
      [Permission.INVITE_STAFF]: 'Send staff invitations',
      [Permission.MANAGE_STAFF]: 'Manage staff roles and settings',
      [Permission.DELETE_STAFF]: 'Remove staff members',
      [Permission.VIEW_BILLING]: 'View billing information',
      [Permission.MANAGE_BILLING]: 'Manage billing and payment methods',
      [Permission.UPDATE_SUBSCRIPTION]: 'Modify subscription plans',
      [Permission.CANCEL_SUBSCRIPTION]: 'Cancel subscriptions',
      [Permission.VIEW_BASIC_ANALYTICS]: 'View basic reports and metrics',
      [Permission.VIEW_ADVANCED_ANALYTICS]: 'View detailed analytics',
      [Permission.VIEW_FINANCIAL_ANALYTICS]: 'View financial reports',
      [Permission.EXPORT_ANALYTICS]: 'Export reports and data',
      [Permission.VIEW_SERVICES]: 'View service catalog',
      [Permission.CREATE_SERVICES]: 'Add new services',
      [Permission.UPDATE_SERVICES]: 'Modify service details',
      [Permission.DELETE_SERVICES]: 'Remove services',
      [Permission.VIEW_MARKETING]: 'View marketing campaigns',
      [Permission.CREATE_CAMPAIGNS]: 'Create marketing campaigns',
      [Permission.SEND_MARKETING]: 'Send marketing messages',
      [Permission.MANAGE_CONTACTS]: 'Manage contact lists',
      [Permission.VIEW_SETTINGS]: 'View organization settings',
      [Permission.UPDATE_SETTINGS]: 'Modify organization settings',
      [Permission.MANAGE_INTEGRATIONS]: 'Configure integrations',
      [Permission.VIEW_ORGANIZATION]: 'View organization details',
      [Permission.UPDATE_ORGANIZATION]: 'Modify organization information',
      [Permission.DELETE_ORGANIZATION]: 'Delete organization',
      [Permission.MANAGE_LOCATIONS]: 'Manage business locations',
      [Permission.SYSTEM_ADMIN]: 'Full platform administration',
      [Permission.VIEW_ALL_ORGANIZATIONS]: 'View all platform organizations',
      [Permission.IMPERSONATE_USERS]: 'Login as other users',
      [Permission.MANAGE_PLATFORM]: 'Manage platform settings',
    }
    
    return descriptions[permission] || 'No description available'
  }

  const hasPermission = (role: UnifiedUserRole, permission: Permission): boolean => {
    return rolePermissions[role]?.permissions.includes(permission as string) || false
  }

  const isPermissionCore = (role: UnifiedUserRole, permission: Permission): boolean => {
    return corePermissions[role]?.has(permission) || false
  }

  const canModifyPermission = (role: UnifiedUserRole, permission: Permission): boolean => {
    const roleData = rolePermissions[role]
    if (!roleData?.can_customize) return false
    
    // Cannot disable core permissions
    if (hasPermission(role, permission) && isPermissionCore(role, permission)) {
      return false
    }
    
    return true
  }

  return (
    <div className="space-y-6">
      {/* Category filter and options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            {/* Category selector */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === 'all' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                All Permissions
              </Button>
              {Object.entries(permissionCategories).map(([key, category]) => (
                <Button
                  key={key}
                  variant={selectedCategory === key ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(key)}
                  className="flex items-center gap-1"
                >
                  <span>{category.icon}</span>
                  {category.label}
                </Button>
              ))}
            </div>
            
            {/* Options */}
            <div className="flex items-center gap-2 ml-auto">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={showOnlyCustomizable}
                  onCheckedChange={setShowOnlyCustomizable}
                  size="sm"
                />
                Show only customizable roles
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permission matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Permission Matrix
            {selectedCategory !== 'all' && (
              <Badge variant="secondary" className="ml-2">
                {permissionCategories[selectedCategory]?.label}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-3 border-b font-semibold min-w-[250px]">
                    Permission
                  </th>
                  {visibleRoles.map(role => (
                    <th key={role} className="text-center p-3 border-b font-semibold min-w-[120px]">
                      <div className="space-y-1">
                        <div className="text-sm">
                          {UserPermissions.getRoleDisplayName(role)}
                        </div>
                        {!rolePermissions[role]?.can_customize && (
                          <Badge variant="secondary" className="text-xs">
                            Fixed
                          </Badge>
                        )}
                        {!rolePermissions[role]?.is_default && (
                          <Badge variant="outline" className="text-xs">
                            Modified
                          </Badge>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visiblePermissions.map(permission => (
                  <tr key={permission} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-3 border-b">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="cursor-help">
                              <div className="font-medium text-sm">
                                {formatPermissionName(permission)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {permission}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{getPermissionDescription(permission)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    
                    {visibleRoles.map(role => {
                      const hasPermissionValue = hasPermission(role, permission)
                      const isCore = isPermissionCore(role, permission)
                      const canModify = canModifyPermission(role, permission)
                      
                      return (
                        <td key={`${role}-${permission}`} className="p-3 border-b text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <Switch
                              checked={hasPermissionValue}
                              onCheckedChange={(checked) => onPermissionChange(role, permission, checked)}
                              disabled={!canModify}
                              size="sm"
                            />
                            {isCore && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="secondary" className="text-xs">
                                      Core
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>This is a core permission that cannot be removed</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Role management actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Role Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleRoles.filter(role => rolePermissions[role]?.can_customize).map(role => {
              const roleData = rolePermissions[role]
              return (
                <div key={role} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">
                      {UserPermissions.getRoleDisplayName(role)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {roleData.permissions.length} permissions
                    </div>
                    {!roleData.is_default && (
                      <Badge variant="outline" className="text-xs mt-1">
                        Modified
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onResetRole(role)}
                    disabled={roleData.is_default}
                  >
                    Reset
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}