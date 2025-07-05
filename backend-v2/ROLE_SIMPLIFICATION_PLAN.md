# Role Simplification Plan - Phase 1.2

## Current System Analysis

### Existing Dual Role System (COMPLEX)
**User model has TWO role fields:**
1. `role` field: "user", "barber", "admin" (legacy system)
2. `user_type` field: "client", "barber", "barbershop" (trial system)

**Organization model has:**
3. `UserRole` enum: OWNER, MANAGER, BARBER, RECEPTIONIST, VIEWER (organization-based)

### Problems with Current System
- **Confusion**: Three different role systems
- **Conflicts**: `role="barber"` vs `user_type="barbershop"` vs `UserRole.OWNER`
- **Complexity**: Frontend needs to check multiple fields
- **Maintenance**: Changes require updates in multiple places

## Proposed Simplified System

### Single Role Hierarchy (CLEAN)
Replace all role systems with one comprehensive enum:

```python
class UserRole(enum.Enum):
    # System roles
    SUPER_ADMIN = "super_admin"      # Platform administrator
    PLATFORM_ADMIN = "platform_admin" # Platform support staff
    
    # Business owners
    ENTERPRISE_OWNER = "enterprise_owner"   # Multi-location owner
    SHOP_OWNER = "shop_owner"              # Single barbershop owner
    INDIVIDUAL_BARBER = "individual_barber" # Solo barber (no organization)
    
    # Staff roles
    SHOP_MANAGER = "shop_manager"          # Location manager
    BARBER = "barber"                     # Staff barber
    RECEPTIONIST = "receptionist"         # Front desk staff
    
    # Client role
    CLIENT = "client"                     # Booking client
    
    # Limited access
    VIEWER = "viewer"                     # Read-only access
```

### Role Hierarchy and Permissions

#### Business Hierarchy
```
ENTERPRISE_OWNER
├── SHOP_OWNER (individual locations)
│   ├── SHOP_MANAGER
│   ├── BARBER
│   └── RECEPTIONIST
└── INDIVIDUAL_BARBER (standalone)

CLIENT (separate from business hierarchy)
```

#### Permission Matrix
| Role | Organization Management | Billing | Staff Management | Analytics | Booking |
|------|------------------------|---------|------------------|-----------|---------|
| ENTERPRISE_OWNER | All locations | Yes | All staff | Advanced | Yes |
| SHOP_OWNER | Own shop only | Yes | Shop staff | Standard | Yes |
| INDIVIDUAL_BARBER | None | Yes | None | Basic | Yes |
| SHOP_MANAGER | Shop operations | No | Shop staff | Standard | Yes |
| BARBER | None | No | None | Basic | Yes |
| RECEPTIONIST | None | No | None | None | Yes |
| CLIENT | None | No | None | None | Yes |

## Implementation Steps

### Step 1: Database Migration
- Add new `unified_role` field to User table
- Migrate existing role data to new system
- Keep old fields temporarily for compatibility

### Step 2: User-Organization Mapping Update
- Update UserOrganization model to use unified roles
- Ensure role assignments match business hierarchy

### Step 3: API Updates
- Update authentication middleware to use unified role
- Modify permission checking functions
- Update role-based access control decorators

### Step 4: Frontend Updates
- Update useAuth hook to return unified role
- Modify role-checking functions throughout frontend
- Update registration flow to assign correct roles

### Step 5: Testing and Migration
- Create comprehensive test users for all roles
- Test role-based access control
- Migrate existing users gradually

### Step 6: Cleanup
- Remove deprecated `role` and `user_type` fields
- Update all documentation
- Remove legacy role checking code

## Migration Mapping

### Current → New Role Mapping
```python
# Legacy user.role + user.user_type → unified_role
("admin", any) → "super_admin"
("barber", "barbershop") → "shop_owner"
("barber", "barber") → "barber" 
("user", "client") → "client"
("user", "barber") → "individual_barber"
```

### Organization Role Mapping
```python
# Current UserRole → New unified role
UserRole.OWNER → "shop_owner" or "enterprise_owner" (based on organization type)
UserRole.MANAGER → "shop_manager"
UserRole.BARBER → "barber"
UserRole.RECEPTIONIST → "receptionist"
UserRole.VIEWER → "viewer"
```

## Benefits of Simplified System

1. **Single Source of Truth**: One field defines user's role and permissions
2. **Clear Hierarchy**: Easy to understand business relationships
3. **Scalable**: Supports growth from individual to enterprise
4. **Maintainable**: Changes only need to happen in one place
5. **Frontend Friendly**: Simple role checking logic

## Implementation Timeline

- **Week 1**: Database migration and backend updates
- **Week 2**: API and middleware updates
- **Week 3**: Frontend integration and testing
- **Week 4**: User migration and cleanup

## Risk Mitigation

1. **Backwards Compatibility**: Keep old fields during transition
2. **Gradual Migration**: Migrate users in batches
3. **Rollback Plan**: Ability to revert to old system if needed
4. **Comprehensive Testing**: Test all role combinations
5. **Documentation**: Update all role-related documentation

This plan eliminates the confusion of multiple role systems while providing a clear, scalable hierarchy that supports our business model transformation.