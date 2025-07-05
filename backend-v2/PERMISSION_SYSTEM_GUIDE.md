# Permission System Guide

## Overview

BookedBarber V2 implements a comprehensive role-based access control (RBAC) system with granular permissions. This guide explains how to use the permission system in both backend and frontend code.

## Unified Role System

The system uses the following unified roles:

### System Roles
- **super_admin**: Platform administrator with full access
- **platform_admin**: Platform support staff with limited system access

### Business Owner Roles
- **enterprise_owner**: Multi-location owner with full business management
- **shop_owner**: Single barbershop owner with shop-level management
- **individual_barber**: Solo barber without organization

### Staff Roles
- **shop_manager**: Location manager with staff and analytics access
- **barber**: Staff barber with appointment and client access
- **receptionist**: Front desk staff with booking management

### Client Role
- **client**: Booking client with limited access

### Limited Access
- **viewer**: Read-only access to basic information

## Available Permissions

### Appointment Permissions
- `VIEW_OWN_APPOINTMENTS`: View personal appointments only
- `VIEW_ALL_APPOINTMENTS`: View all appointments in organization
- `CREATE_APPOINTMENTS`: Create new appointments
- `UPDATE_APPOINTMENTS`: Modify existing appointments
- `DELETE_APPOINTMENTS`: Delete appointments

### Client Permissions
- `VIEW_OWN_CLIENT_INFO`: View personal client information
- `VIEW_ALL_CLIENTS`: View all clients in organization
- `CREATE_CLIENTS`: Add new clients
- `UPDATE_CLIENTS`: Modify client information
- `DELETE_CLIENTS`: Remove clients

### Staff Management
- `VIEW_STAFF`: View staff list
- `INVITE_STAFF`: Send staff invitations
- `MANAGE_STAFF`: Modify staff settings
- `DELETE_STAFF`: Remove staff members

### Billing Permissions
- `VIEW_BILLING`: View billing information
- `MANAGE_BILLING`: Modify billing settings
- `UPDATE_SUBSCRIPTION`: Change subscription plans
- `CANCEL_SUBSCRIPTION`: Cancel subscriptions

### Analytics Permissions
- `VIEW_BASIC_ANALYTICS`: Access basic metrics
- `VIEW_ADVANCED_ANALYTICS`: Access detailed analytics
- `VIEW_FINANCIAL_ANALYTICS`: Access financial reports
- `EXPORT_ANALYTICS`: Export analytics data

### Service Management
- `VIEW_SERVICES`: View service catalog
- `CREATE_SERVICES`: Add new services
- `UPDATE_SERVICES`: Modify services
- `DELETE_SERVICES`: Remove services

### Marketing Permissions
- `VIEW_MARKETING`: View marketing tools
- `CREATE_CAMPAIGNS`: Create marketing campaigns
- `SEND_MARKETING`: Send marketing messages
- `MANAGE_CONTACTS`: Manage contact lists

### Settings Permissions
- `VIEW_SETTINGS`: View settings
- `UPDATE_SETTINGS`: Modify settings
- `MANAGE_INTEGRATIONS`: Configure integrations

### Organization Permissions
- `VIEW_ORGANIZATION`: View organization details
- `UPDATE_ORGANIZATION`: Modify organization
- `DELETE_ORGANIZATION`: Delete organization
- `MANAGE_LOCATIONS`: Manage multiple locations

### System Admin Permissions
- `SYSTEM_ADMIN`: System administration access
- `VIEW_ALL_ORGANIZATIONS`: View all organizations
- `IMPERSONATE_USERS`: Act as other users
- `MANAGE_PLATFORM`: Platform management

## Backend Usage

### 1. Import Required Components

```python
from utils.role_permissions import (
    Permission,
    PermissionChecker,
    get_permission_checker,
    require_permission
)
```

### 2. Check Permissions in Endpoints

```python
@router.post("/sensitive-action")
async def sensitive_endpoint(
    request: RequestModel,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Create permission checker
    checker = PermissionChecker(current_user, db, request.organization_id)
    
    # Check single permission
    if not checker.has_permission(Permission.MANAGE_BILLING):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have billing permissions"
        )
    
    # Your endpoint logic here
```

### 3. Using Permission Decorators

```python
# Single permission required
@require_permission(Permission.MANAGE_STAFF)
async def manage_staff_endpoint(
    permission_checker: PermissionChecker = Depends(get_permission_checker),
    # other dependencies
):
    # Endpoint logic
    pass

# Multiple permissions (ANY)
@require_any_permission(Permission.VIEW_BILLING, Permission.MANAGE_BILLING)
async def billing_endpoint(
    permission_checker: PermissionChecker = Depends(get_permission_checker),
    # other dependencies
):
    # Endpoint logic
    pass
```

### 4. Organization-Specific Permissions

```python
# Check permissions within organization context
checker = PermissionChecker(current_user, db, organization_id=123)
if checker.has_permission(Permission.UPDATE_ORGANIZATION):
    # User can update this specific organization
    pass
```

## Frontend Usage

### 1. Import Components and Hooks

```typescript
import { PermissionGuard, BusinessOwnerGuard } from '@/components/PermissionGuard'
import { usePermissions, Permission } from '@/hooks/usePermissions'
```

### 2. Protect Components with Guards

```tsx
// Single permission
<PermissionGuard permission={Permission.MANAGE_BILLING}>
  <BillingSettings />
</PermissionGuard>

// Multiple permissions (ANY)
<PermissionGuard permissions={[Permission.VIEW_STAFF, Permission.MANAGE_STAFF]}>
  <StaffList />
</PermissionGuard>

// Multiple permissions (ALL required)
<PermissionGuard 
  permissions={[Permission.VIEW_BILLING, Permission.MANAGE_BILLING]} 
  requireAll={true}
>
  <FullBillingAccess />
</PermissionGuard>

// With custom fallback
<PermissionGuard 
  permission={Permission.DELETE_ORGANIZATION}
  fallback={<PermissionDenied message="Only owners can delete organizations" />}
>
  <DeleteOrganizationButton />
</PermissionGuard>
```

### 3. Role-Based Guards

```tsx
// Business owners only
<BusinessOwnerGuard>
  <BusinessDashboard />
</BusinessOwnerGuard>

// Staff members only
<StaffGuard>
  <StaffTools />
</StaffGuard>

// System admins only
<SystemAdminGuard>
  <PlatformSettings />
</SystemAdminGuard>
```

### 4. Using the Permission Hook

```tsx
function MyComponent() {
  const permissions = usePermissions()
  
  return (
    <div>
      {permissions.canManageBilling && (
        <button>Manage Billing</button>
      )}
      
      {permissions.hasPermission(Permission.INVITE_STAFF) && (
        <button>Invite Staff</button>
      )}
      
      {permissions.isBusinessOwner() && (
        <div>Business owner features</div>
      )}
    </div>
  )
}
```

### 5. Organization-Specific Permissions

```tsx
function OrganizationSettings({ organizationId }: { organizationId: number }) {
  const permissions = usePermissions(organizationId)
  
  return (
    <PermissionGuard 
      permission={Permission.UPDATE_ORGANIZATION}
      organizationId={organizationId}
    >
      <OrganizationForm />
    </PermissionGuard>
  )
}
```

## Migration from Legacy System

### Backend Migration

Replace old permission checks:

```python
# Old way
if not user_org.can_manage_billing:
    raise PermissionError("No billing access")

# New way
checker = PermissionChecker(current_user, db, org.id)
if not checker.has_permission(Permission.MANAGE_BILLING):
    raise HTTPException(status_code=403, detail="No billing access")
```

### Frontend Migration

Replace role checks with permission checks:

```tsx
// Old way
if (user.role === 'admin') {
  // Show admin features
}

// New way
if (permissions.hasPermission(Permission.SYSTEM_ADMIN)) {
  // Show admin features
}
```

## Best Practices

1. **Always check permissions at the API level** - Frontend checks are for UX only
2. **Use specific permissions** rather than role checks when possible
3. **Provide meaningful error messages** when denying access
4. **Cache permission checks** in components to avoid repeated calculations
5. **Test with different roles** to ensure proper access control

## Testing Permissions

### Backend Testing

```python
# Test with different user roles
def test_billing_access():
    # Create shop owner
    owner = create_test_user(unified_role="shop_owner")
    checker = PermissionChecker(owner, db, org_id=1)
    assert checker.has_permission(Permission.MANAGE_BILLING)
    
    # Create barber
    barber = create_test_user(unified_role="barber")
    checker = PermissionChecker(barber, db, org_id=1)
    assert not checker.has_permission(Permission.MANAGE_BILLING)
```

### Frontend Testing

```tsx
// Test component rendering with permissions
it('shows billing button for authorized users', () => {
  const mockUser = { unified_role: 'shop_owner' }
  render(
    <AuthContext.Provider value={{ user: mockUser }}>
      <BillingComponent />
    </AuthContext.Provider>
  )
  expect(screen.getByText('Manage Billing')).toBeInTheDocument()
})
```

## Common Patterns

### 1. Progressive Disclosure

Show more features as permissions increase:

```tsx
<div>
  <PermissionGuard permission={Permission.VIEW_BASIC_ANALYTICS}>
    <BasicAnalytics />
  </PermissionGuard>
  
  <PermissionGuard permission={Permission.VIEW_ADVANCED_ANALYTICS}>
    <AdvancedAnalytics />
  </PermissionGuard>
  
  <PermissionGuard permission={Permission.VIEW_FINANCIAL_ANALYTICS}>
    <FinancialReports />
  </PermissionGuard>
</div>
```

### 2. Action Buttons

Show/hide actions based on permissions:

```tsx
function StaffCard({ staff }) {
  const permissions = usePermissions()
  
  return (
    <div className="staff-card">
      <h3>{staff.name}</h3>
      
      {permissions.hasPermission(Permission.UPDATE_STAFF) && (
        <button>Edit</button>
      )}
      
      {permissions.hasPermission(Permission.DELETE_STAFF) && (
        <button>Delete</button>
      )}
    </div>
  )
}
```

### 3. Dashboard Widgets

Conditionally show dashboard sections:

```tsx
function Dashboard() {
  return (
    <div className="dashboard-grid">
      <PermissionGuard permission={Permission.VIEW_BASIC_ANALYTICS}>
        <AppointmentStats />
      </PermissionGuard>
      
      <PermissionGuard permission={Permission.VIEW_FINANCIAL_ANALYTICS}>
        <RevenueChart />
      </PermissionGuard>
      
      <BusinessOwnerGuard>
        <BusinessMetrics />
      </BusinessOwnerGuard>
    </div>
  )
}
```

## Troubleshooting

### Permission Denied Issues

1. Check user's unified role is set correctly
2. Verify organization-specific permissions if applicable
3. Ensure permission checker has correct organization context
4. Check if legacy role mapping is needed

### Performance Considerations

1. Permission checks are cached per request
2. Use `useMemo` in React components for expensive permission calculations
3. Batch permission checks when possible

### Debugging

Enable permission debugging:

```python
# Backend
logger.debug(f"User {user.id} permissions: {checker.user_permissions}")

# Frontend
console.log('User permissions:', permissions.permissions)
```

---

For more examples, see `/frontend-v2/components/examples/PermissionExamples.tsx`