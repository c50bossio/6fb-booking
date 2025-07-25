'use client'

import { useState } from 'react'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { UnifiedUserRole, PermissionChange } from '@/lib/api'
import { UserPermissions } from '@/lib/permissions'
import { Permission } from '@/hooks/usePermissions'

interface PermissionAuditTrailProps {
  auditTrail: PermissionChange[]
}

export function PermissionAuditTrail({ auditTrail }: PermissionAuditTrailProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const [selectedAction, setSelectedAction] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Filter audit trail
  const filteredTrail = auditTrail.filter(change => {
    const matchesSearch = 
      change.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      change.permission.toLowerCase().includes(searchTerm.toLowerCase()) ||
      UserPermissions.getRoleDisplayName(change.role).toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = selectedRole === 'all' || change.role === selectedRole
    const matchesAction = selectedAction === 'all' || change.action === selectedAction
    
    return matchesSearch && matchesRole && matchesAction
  })

  // Pagination
  const totalPages = Math.ceil(filteredTrail.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTrail = filteredTrail.slice(startIndex, endIndex)

  const formatPermissionName = (permission: string): string => {
    return permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const getActionIcon = (action: 'granted' | 'revoked'): string => {
    return action === 'granted' ? '✅' : '❌'
  }

  const getActionColor = (action: 'granted' | 'revoked'): string => {
    return action === 'granted' ? 'text-green-600' : 'text-red-600'
  }

  const getUserInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // Mock data if audit trail is empty
  const mockAuditTrail: PermissionChange[] = [
    {
      role: 'shop_manager',
      permission: Permission.MANAGE_BILLING,
      action: 'granted',
      timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      user_id: 1,
      user_name: 'John Doe'
    },
    {
      role: 'barber',
      permission: Permission.DELETE_APPOINTMENTS,
      action: 'revoked',
      timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      user_id: 2,
      user_name: 'Jane Smith'
    },
    {
      role: 'receptionist',
      permission: Permission.VIEW_FINANCIAL_ANALYTICS,
      action: 'granted',
      timestamp: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
      user_id: 1,
      user_name: 'John Doe'
    },
    {
      role: 'shop_owner',
      permission: Permission.SYSTEM_ADMIN,
      action: 'revoked',
      timestamp: new Date(Date.now() - 432000000).toISOString(), // 5 days ago
      user_id: 3,
      user_name: 'Admin User'
    }
  ]

  const displayTrail = auditTrail.length > 0 ? filteredTrail : mockAuditTrail
  const displayPaginatedTrail = auditTrail.length > 0 ? paginatedTrail : mockAuditTrail

  // Get unique roles for filter
  const allRoles: UnifiedUserRole[] = [
    'super_admin', 'platform_admin', 'enterprise_owner', 'shop_owner',
    'individual_barber', 'shop_manager', 'barber', 'receptionist', 'client', 'viewer'
  ]

  return (
    <div className="space-y-6">
      {/* Header and stats */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Audit Trail</CardTitle>
          <CardDescription>
            Track all permission changes made to user roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{displayTrail.length}</div>
              <div className="text-sm text-blue-600">Total Changes</div>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {displayTrail.filter(c => c.action === 'granted').length}
              </div>
              <div className="text-sm text-green-600">Permissions Granted</div>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {displayTrail.filter(c => c.action === 'revoked').length}
              </div>
              <div className="text-sm text-red-600">Permissions Revoked</div>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {new Set(displayTrail.map(c => c.user_id)).size}
              </div>
              <div className="text-sm text-purple-600">Users Involved</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Changes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by user, permission, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-48">
              <Select 
                value={selectedRole} 
                onChange={(value) => setSelectedRole(value as string)}
                placeholder="Filter by role"
                options={[
                  { value: 'all', label: 'All Roles' },
                  ...allRoles.map(role => ({
                    value: role,
                    label: UserPermissions.getRoleDisplayName(role)
                  }))
                ]}
              />
            </div>
            <div className="w-48">
              <Select 
                value={selectedAction} 
                onChange={(value) => setSelectedAction(value as string)}
                placeholder="Filter by action"
                options={[
                  { value: 'all', label: 'All Actions' },
                  { value: 'granted', label: 'Granted' },
                  { value: 'revoked', label: 'Revoked' }
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit trail list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Recent Changes 
            {auditTrail.length === 0 && (
              <Badge variant="secondary" className="ml-2">Demo Data</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {displayPaginatedTrail.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No permission changes found matching your filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayPaginatedTrail.map((change, index) => (
                <div key={index} className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  {/* User avatar */}
                  <Avatar>
                    <AvatarFallback>
                      {getUserInitials(change.user_name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Change details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-lg">{getActionIcon(change.action)}</span>
                      <span className="font-medium">{change.user_name}</span>
                      <span className={`text-sm font-medium ${getActionColor(change.action)}`}>
                        {change.action === 'granted' ? 'granted' : 'revoked'}
                      </span>
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {formatPermissionName(change.permission)}
                      </code>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <span>for role</span>
                      <Badge variant="outline">
                        {UserPermissions.getRoleDisplayName(change.role)}
                      </Badge>
                      <span>•</span>
                      <span>{formatTimestamp(change.timestamp)}</span>
                    </div>

                    <div className="mt-2 text-xs text-gray-500">
                      Permission: <code>{change.permission}</code>
                    </div>
                  </div>

                  {/* Action badge */}
                  <Badge 
                    variant={change.action === 'granted' ? 'default' : 'destructive'}
                    className="shrink-0"
                  >
                    {change.action}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1}-{Math.min(endIndex, displayTrail.length)} of {displayTrail.length} changes
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm px-3 py-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empty state for no audit data */}
      {auditTrail.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-semibold mb-2">No Audit Trail Yet</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Permission changes will appear here once you start modifying role permissions.
              The demo data above shows what the audit trail will look like.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}