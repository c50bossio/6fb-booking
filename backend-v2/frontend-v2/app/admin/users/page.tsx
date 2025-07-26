'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAllUsers, updateUserRole, getProfile, type User } from '@/lib/api'
import AccessControl from '@/components/auth/AccessControl'
import { LoadingButton, ErrorDisplay } from '@/components/LoadingStates'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toastSuccess, toastError } from '@/hooks/use-toast'
import { 
  UserIcon, 
  ShieldCheckIcon, 
  ScissorsIcon,
  UsersIcon,
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline'

const ROLE_OPTIONS = [
  { value: 'user', label: 'User', icon: UserIcon, color: 'bg-gray-100 text-gray-800' },
  { value: 'barber', label: 'Barber', icon: ScissorsIcon, color: 'bg-blue-100 text-blue-800' },
  { value: 'admin', label: 'Admin', icon: ShieldCheckIcon, color: 'bg-purple-100 text-purple-800' },
  { value: 'super_admin', label: 'Super Admin', icon: ShieldCheckIcon, color: 'bg-red-100 text-red-800' }
]

function AdminUsersPageContent() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingRoleChange, setPendingRoleChange] = useState<{ userId: number; newRole: string; userName: string } | null>(null)

  useEffect(() => {
    loadUsers()
    loadCurrentUser()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm, roleFilter])

  const loadCurrentUser = async () => {
    try {
      const user = await getProfile()
      // Ensure role is always defined
      setCurrentUser({
        ...user,
        role: user.role || 'user'
      })
    } catch (error) {
      console.error('Failed to load current user:', error)
    }
  }

  const loadUsers = async () => {
    try {
      setLoading(true)
      const allUsers = await getAllUsers()
      setUsers(allUsers)
      setFilteredUsers(allUsers)
    } catch (error: any) {
      if (error.message.includes('403')) {
        toastError('Access Denied', 'Only admins can access user management')
        router.push('/dashboard')
      } else if (error.message.includes('401')) {
        router.push('/login')
      } else {
        toastError('Error', 'Failed to load users')
      }
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = [...users]
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Role filter
    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter)
    }
    
    setFilteredUsers(filtered)
  }

  const handleRoleChange = (userId: number, newRole: string, userName: string) => {
    // Show confirmation modal
    setPendingRoleChange({ userId, newRole, userName })
    setShowConfirmModal(true)
  }

  const confirmRoleChange = async () => {
    if (!pendingRoleChange) return

    try {
      setUpdatingUserId(pendingRoleChange.userId)
      setShowConfirmModal(false)
      
      await updateUserRole(pendingRoleChange.userId, pendingRoleChange.newRole)
      
      // Update local state
      setUsers(users.map(user => 
        user.id === pendingRoleChange.userId 
          ? { ...user, role: pendingRoleChange.newRole }
          : user
      ))
      
      toastSuccess('Success', `Updated ${pendingRoleChange.userName}'s role to ${pendingRoleChange.newRole}`)
    } catch (error: any) {
      toastError('Error', error.message || 'Failed to update user role')
    } finally {
      setUpdatingUserId(null)
      setPendingRoleChange(null)
    }
  }

  const getRoleInfo = (role: string) => {
    return ROLE_OPTIONS.find(r => r.value === role) || ROLE_OPTIONS[0]
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading users...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Manage user accounts and roles
              </p>
            </div>
            <Button
              onClick={() => router.push('/admin')}
              variant="outline"
            >
              Back to Admin
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={roleFilter}
                onChange={(value) => setRoleFilter(value as string || '')}
                options={[
                  { value: '', label: 'All Roles' },
                  ...ROLE_OPTIONS.map(role => ({
                    value: role.value,
                    label: role.label,
                    icon: React.createElement(role.icon, { className: 'w-4 h-4' })
                  }))
                ]}
                placeholder="Filter by role"
              />
              <div className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {filteredUsers.length} users
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Current Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Member Since
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredUsers.map((user) => {
                    const roleInfo = getRoleInfo(user.role || 'user')
                    const isCurrentUser = currentUser?.id === user.id
                    const isSuperAdmin = user.role === 'super_admin'
                    const canEdit = !isCurrentUser && (!isSuperAdmin || currentUser?.role === 'super_admin')
                    
                    return (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <UserIcon className="h-8 w-8 text-gray-400 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {user.name}
                                {isCurrentUser && (
                                  <span className="ml-2 text-xs text-gray-500">(You)</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">ID: {user.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={roleInfo.color}>
                            <roleInfo.icon className="h-4 w-4 mr-1" />
                            {roleInfo.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {canEdit ? (
                            <Select
                              value={user.role || 'user'}
                              onChange={(value) => handleRoleChange(user.id, value as string, user.name || user.email)}
                              disabled={updatingUserId === user.id}
                              className="w-40"
                              options={ROLE_OPTIONS.map(role => ({
                                value: role.value,
                                label: role.label,
                                disabled: role.value === 'super_admin' && currentUser?.role !== 'super_admin',
                                icon: React.createElement(role.icon, { className: 'w-4 h-4' })
                              }))}
                            />
                          ) : (
                            <span className="text-sm text-gray-400">
                              {isCurrentUser ? 'Cannot edit own role' : 'Protected'}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Confirmation Modal */}
        {showConfirmModal && pendingRoleChange && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="max-w-md w-full mx-4">
              <CardHeader>
                <CardTitle>Confirm Role Change</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Are you sure you want to change <strong>{pendingRoleChange.userName}</strong>&apos;s role to{' '}
                  <strong>{getRoleInfo(pendingRoleChange.newRole).label}</strong>?
                </p>
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowConfirmModal(false)
                      setPendingRoleChange(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={confirmRoleChange}
                  >
                    Confirm Change
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminUsersPage() {
  return (
    <AccessControl requiredRoles={['super_admin', 'platform_admin']}>
      <AdminUsersPageContent />
    </AccessControl>
  )
}