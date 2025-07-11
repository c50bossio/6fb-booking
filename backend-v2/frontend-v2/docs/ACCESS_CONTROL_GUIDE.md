# Access Control System - Implementation Guide

## Overview

BookedBarber V2 now implements a comprehensive role-based access control (RBAC) system that ensures users can only access pages and features appropriate for their role level. This system provides multiple layers of protection and user-friendly error handling.

## Key Features

### ✅ **Role-Based Access Control**
- **Super Admin/Platform Admin**: Full system access
- **Admin/Shop Owner**: Business management access
- **Barber**: Service delivery access
- **User/Client**: Basic booking access

### ✅ **Multi-Layer Security**
- **Middleware-level** protection (server-side)
- **Component-level** protection (client-side)
- **Route-level** configuration
- **Real-time** access validation

### ✅ **User Experience**
- **Graceful redirects** to appropriate pages
- **Clear error messages** for access denials
- **Loading states** during access checks
- **Fallback content** for unauthorized access

## Implementation Components

### 1. Core Access Control System

#### `/lib/access-control.ts`
- **Route configuration** with role requirements
- **Access validation** logic
- **Role hierarchy** management
- **Route matching** algorithms

#### `/lib/auth-middleware.ts`
- **Middleware integration** with Next.js
- **Token validation** and role extraction
- **Security headers** management
- **Access logging** for monitoring

### 2. React Components

#### `/components/auth/AccessControl.tsx`
- **Main wrapper** component for protecting pages
- **Access denied** page with user-friendly messaging
- **Role-based content** conditional rendering
- **Access control hooks** for programmatic checks

#### `/components/auth/RoleGuard.tsx`
- **Lightweight protection** for specific components
- **Role validation** with fallback content
- **Loading states** during authentication checks
- **Error handling** for authentication failures

### 3. Integration Points

#### `middleware.ts`
- **Enhanced with** role-based access control
- **Maintains compatibility** with existing system
- **Provides fallback** authentication handling

#### Individual Pages
- **Wrapped with** AccessControl components
- **Specify required roles** for each page
- **Graceful degradation** for unauthorized access

## Usage Examples

### 1. Protecting a Complete Page

```typescript
// app/admin/users/page.tsx
import AccessControl from '@/components/auth/AccessControl'

function AdminUsersPageContent() {
  // Your page content here
  return <div>Admin Users Page</div>
}

export default function AdminUsersPage() {
  return (
    <AccessControl requiredRoles={['super_admin', 'platform_admin']}>
      <AdminUsersPageContent />
    </AccessControl>
  )
}
```

### 2. Protecting Specific Components

```typescript
// Inside any component
import { RoleBasedContent } from '@/components/auth/RoleGuard'

function MyComponent() {
  return (
    <div>
      <h1>Public Content</h1>
      
      <RoleBasedContent allowedRoles={['admin', 'super_admin']}>
        <button>Admin Only Button</button>
      </RoleBasedContent>
      
      <RoleBasedContent 
        allowedRoles={['barber']}
        fallback={<div>Barber access required</div>}
      >
        <div>Barber-specific content</div>
      </RoleBasedContent>
    </div>
  )
}
```

### 3. Programmatic Access Checks

```typescript
// Using the access control hook
import { useAccessControl } from '@/components/auth/AccessControl'

function MyComponent() {
  const { hasAccess, isChecking } = useAccessControl('/admin/users')
  
  if (isChecking) return <div>Checking permissions...</div>
  
  return (
    <div>
      {hasAccess ? (
        <button>Access Admin Users</button>
      ) : (
        <div>Access denied</div>
      )}
    </div>
  )
}
```

## Role Hierarchy

The system implements a hierarchical role structure where higher roles inherit permissions from lower roles:

```
Super Admin / Platform Admin (ALL PERMISSIONS)
├── Admin / Shop Owner
│   ├── Barber / Individual Barber
│   │   ├── User / Client
│   │   └── (Basic access)
│   └── (Service & business management)
└── (Full system administration)
```

### Role Definitions

- **Super Admin**: Platform-wide administration
- **Platform Admin**: Platform administration without user management
- **Enterprise Owner**: Multi-location enterprise management
- **Shop Owner**: Single shop ownership and management
- **Shop Manager**: Shop management without ownership
- **Individual Barber**: Self-employed barber
- **Barber**: Employee barber
- **Receptionist**: Front desk operations
- **Client/User**: Customer access

## Route Access Matrix

| Route Category | Super Admin | Admin | Barber | User |
|---------------|-------------|-------|--------|------|
| User Management | ✅ | ❌ | ❌ | ❌ |
| Business Tools | ✅ | ❌ | ❌ | ❌ |
| Admin Dashboard | ✅ | ✅ | ❌ | ❌ |
| Service Management | ✅ | ✅ | ❌ | ❌ |
| Client Management | ✅ | ✅ | ✅ | ❌ |
| Calendar | ✅ | ✅ | ✅ | ❌ |
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Bookings | ❌ | ❌ | ❌ | ✅ |
| Public Pages | ✅ | ✅ | ✅ | ✅ |

## Error Handling & User Experience

### Access Denied Page
- **Clear messaging** about why access was denied
- **Role-specific redirects** to appropriate pages
- **Action buttons** for navigation
- **Visual indicators** for error states

### Loading States
- **Permission checking** indicators
- **Smooth transitions** between states
- **Timeout handling** for slow responses
- **Fallback content** for errors

### Redirect Logic
- **Unauthenticated users** → Login page
- **Insufficient permissions** → Role-appropriate dashboard
- **Remembers attempted path** for post-login redirect
- **Prevents redirect loops** with smart routing

## Security Features

### Token Validation
- **JWT token verification** on every request
- **Role extraction** from validated tokens
- **Automatic refresh** for expired tokens
- **Clean logout** with token cleanup

### Request Logging
- **Access attempts** logged for monitoring
- **Failed access** attempts tracked
- **Role-based activity** monitoring
- **Security alerts** for suspicious activity

### Headers & Middleware
- **Security headers** for protected routes
- **CORS configuration** with role awareness
- **Rate limiting** for sensitive endpoints
- **XSS protection** for admin interfaces

## Testing

### Automated Tests
Run the access control test suite:

```typescript
import { printAccessControlTestResults } from '@/lib/test-access-control'

// In development console
printAccessControlTestResults()
```

### Manual Testing
1. **Create test users** with different roles
2. **Attempt to access** protected routes
3. **Verify redirects** work correctly
4. **Test error messages** are user-friendly
5. **Check loading states** during auth checks

## Configuration

### Adding New Protected Routes

1. **Update route configuration** in `access-control.ts`:
```typescript
{
  path: '/new-feature',
  allowedRoles: ['admin', 'super_admin'],
  requiresAuth: true,
  description: 'New feature description'
}
```

2. **Wrap the page** with AccessControl:
```typescript
export default function NewFeaturePage() {
  return (
    <AccessControl requiredRoles={['admin', 'super_admin']}>
      <NewFeatureContent />
    </AccessControl>
  )
}
```

### Customizing Error Messages

Modify the `AccessDeniedPage` component in `AccessControl.tsx` to customize error messages and redirect logic.

### Adding New Roles

1. **Update role types** in `navigation.ts`
2. **Add role mapping** in `access-control.ts`
3. **Update test scenarios** in `test-access-control.ts`
4. **Test thoroughly** with the new role

## Best Practices

### 1. **Principle of Least Privilege**
- Grant users the **minimum access** required
- Regularly **audit permissions** for accuracy
- **Document role requirements** for new features

### 2. **Defense in Depth**
- **Multiple layers** of access control
- **Client and server** side validation
- **Fallback security** measures

### 3. **User Experience**
- **Clear error messages** for access denials
- **Smooth transitions** between states
- **Helpful navigation** options

### 4. **Monitoring & Auditing**
- **Log all access** attempts
- **Monitor for** suspicious activity
- **Regular security** reviews

## Troubleshooting

### Common Issues

1. **Access denied loops**
   - Check role hierarchy configuration
   - Verify token contains correct role
   - Ensure redirect paths are accessible

2. **Loading states persist**
   - Check authentication endpoint availability
   - Verify token validation logic
   - Add timeout handling

3. **Role changes not reflected**
   - Clear browser cache and tokens
   - Restart development server
   - Check role mapping configuration

### Debug Tools

Enable development logging:
```typescript
// In development environment
if (process.env.NODE_ENV === 'development') {
  console.log('Access control debug mode enabled')
}
```

## Migration Guide

### From Basic Auth to RBAC

1. **Audit existing routes** for access requirements
2. **Define role structure** based on business needs
3. **Implement gradually** starting with most sensitive routes
4. **Test thoroughly** with all user types
5. **Monitor logs** for access issues

### Updating Existing Pages

1. **Import AccessControl** component
2. **Wrap page content** with access control
3. **Specify required roles** for the page
4. **Test access** with different user roles
5. **Update navigation** to hide inaccessible items

## Future Enhancements

### Planned Features
- **Dynamic permissions** based on business rules
- **Time-based access** controls
- **Location-based restrictions**
- **Advanced audit logging**
- **Permission inheritance** improvements

### Integration Opportunities
- **Third-party identity** providers
- **Multi-factor authentication** integration
- **Advanced threat detection**
- **Compliance reporting** tools

---

This access control system provides a robust foundation for securing the BookedBarber V2 application while maintaining excellent user experience. Regular testing and monitoring ensure the system remains secure and performant as the application grows.