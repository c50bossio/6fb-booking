'use client'

import React from 'react'
import { 
  PermissionGuard, 
  BusinessOwnerGuard, 
  StaffGuard,
  SystemAdminGuard,
  PermissionDenied 
} from '@/components/PermissionGuard'
import { Permission } from '@/hooks/usePermissions'

/**
 * Examples of how to use the permission system in components
 */

// Example 1: Protect a billing settings component
export function BillingSettingsExample() {
  return (
    <PermissionGuard 
      permission={Permission.MANAGE_BILLING}
      fallback={<PermissionDenied message="You need billing management permissions to access this section" />}
    >
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Billing Settings</h2>
        <p>Only users with MANAGE_BILLING permission can see this</p>
        {/* Billing settings content */}
      </div>
    </PermissionGuard>
  )
}

// Example 2: Show different content based on permissions
export function AnalyticsDashboardExample() {
  return (
    <div className="space-y-6">
      {/* Basic analytics for everyone with basic permission */}
      <PermissionGuard permission={Permission.VIEW_BASIC_ANALYTICS}>
        <div className="p-4 bg-blue-50 rounded">
          <h3 className="font-semibold">Basic Analytics</h3>
          <p>Appointment counts, basic metrics</p>
        </div>
      </PermissionGuard>

      {/* Advanced analytics for those with advanced permission */}
      <PermissionGuard permission={Permission.VIEW_ADVANCED_ANALYTICS}>
        <div className="p-4 bg-green-50 rounded">
          <h3 className="font-semibold">Advanced Analytics</h3>
          <p>Trends, patterns, and insights</p>
        </div>
      </PermissionGuard>

      {/* Financial analytics for those with financial permission */}
      <PermissionGuard permission={Permission.VIEW_FINANCIAL_ANALYTICS}>
        <div className="p-4 bg-yellow-50 rounded">
          <h3 className="font-semibold">Financial Analytics</h3>
          <p>Revenue, earnings, and financial reports</p>
        </div>
      </PermissionGuard>
    </div>
  )
}

// Example 3: Staff management with multiple permissions
export function StaffManagementExample() {
  return (
    <div className="space-y-4">
      {/* View staff list - needs VIEW_STAFF permission */}
      <PermissionGuard permission={Permission.VIEW_STAFF}>
        <div className="border rounded p-4">
          <h3 className="font-semibold mb-2">Staff List</h3>
          {/* Staff list component */}
        </div>
      </PermissionGuard>

      {/* Invite new staff - needs INVITE_STAFF permission */}
      <PermissionGuard permission={Permission.INVITE_STAFF}>
        <button className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">
          Invite New Staff Member
        </button>
      </PermissionGuard>

      {/* Delete staff - needs DELETE_STAFF permission */}
      <PermissionGuard permission={Permission.DELETE_STAFF}>
        <div className="text-red-600">
          <p>Danger zone: Remove staff members</p>
        </div>
      </PermissionGuard>
    </div>
  )
}

// Example 4: Using role-based guards
export function RoleBasedExample() {
  return (
    <div className="space-y-6">
      {/* Only business owners see this */}
      <BusinessOwnerGuard>
        <div className="p-4 bg-purple-50 rounded">
          <h3 className="font-semibold">Business Owner Section</h3>
          <p>Enterprise owners, shop owners, and individual barbers</p>
        </div>
      </BusinessOwnerGuard>

      {/* Only staff members see this */}
      <StaffGuard>
        <div className="p-4 bg-indigo-50 rounded">
          <h3 className="font-semibold">Staff Section</h3>
          <p>Shop managers, barbers, and receptionists</p>
        </div>
      </StaffGuard>

      {/* Only system admins see this */}
      <SystemAdminGuard>
        <div className="p-4 bg-red-50 rounded">
          <h3 className="font-semibold">System Admin Section</h3>
          <p>Platform administrators only</p>
        </div>
      </SystemAdminGuard>
    </div>
  )
}

// Example 5: Multiple permissions with ANY logic
export function MarketingToolsExample() {
  return (
    <PermissionGuard 
      permissions={[Permission.VIEW_MARKETING, Permission.CREATE_CAMPAIGNS, Permission.SEND_MARKETING]}
      fallback={<p className="text-gray-500">No marketing permissions</p>}
    >
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Marketing Tools</h2>
        <p>User has at least one marketing permission</p>
      </div>
    </PermissionGuard>
  )
}

// Example 6: Multiple permissions with ALL logic
export function FullBillingAccessExample() {
  return (
    <PermissionGuard 
      permissions={[Permission.VIEW_BILLING, Permission.MANAGE_BILLING, Permission.CANCEL_SUBSCRIPTION]}
      requireAll={true}
      fallback={<p className="text-gray-500">You need full billing access to use this feature</p>}
    >
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Complete Billing Management</h2>
        <p>User has ALL billing permissions</p>
      </div>
    </PermissionGuard>
  )
}

// Example 7: Organization-specific permissions
export function OrganizationSpecificExample({ organizationId }: { organizationId: number }) {
  return (
    <PermissionGuard 
      permission={Permission.UPDATE_ORGANIZATION}
      organizationId={organizationId}
      fallback={<p className="text-gray-500">You cannot edit this organization</p>}
    >
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Edit Organization</h2>
        <p>User can edit organization {organizationId}</p>
      </div>
    </PermissionGuard>
  )
}

// Example 8: Using the permission hook directly
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/hooks/useAuth'

export function ConditionalUIExample() {
  const { user } = useAuth()
  const permissions = usePermissions()

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Dynamic UI based on permissions</h3>
      
      {permissions.canManageBilling && (
        <button className="px-4 py-2 bg-green-600 text-white rounded">
          Manage Billing
        </button>
      )}

      {permissions.canManageStaff && (
        <button className="px-4 py-2 bg-blue-600 text-white rounded">
          Manage Staff
        </button>
      )}

      {permissions.canViewAnalytics && (
        <button className="px-4 py-2 bg-purple-600 text-white rounded">
          View Analytics
        </button>
      )}

      <div className="text-sm text-gray-600">
        <p>User role: {user?.unified_role || user?.role || 'Unknown'}</p>
        <p>Is business owner: {permissions.isBusinessOwner() ? 'Yes' : 'No'}</p>
        <p>Is staff member: {permissions.isStaffMember() ? 'Yes' : 'No'}</p>
        <p>Is system admin: {permissions.isSystemAdmin() ? 'Yes' : 'No'}</p>
      </div>
    </div>
  )
}