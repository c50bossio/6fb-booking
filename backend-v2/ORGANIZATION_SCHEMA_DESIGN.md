# Organization-Based Hierarchy Schema Design

## Overview

This document describes the database schema design for the new organization-based hierarchy system in BookedBarber V2. The system supports individual barbers, single barbershops, and multi-location enterprises with a chair-based billing model.

## Phase 1.1 Implementation Status

✅ **COMPLETED**
- Database tables created and migrated
- SQLAlchemy models implemented with relationships
- Pydantic schemas for API validation
- API router with full CRUD operations
- Permission system with role-based access control
- Migration file with enhancements and indexes

## Database Schema

### Organizations Table

The `organizations` table is the core of the hierarchy system:

```sql
CREATE TABLE organizations (
    -- Primary identification
    id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    
    -- Address and contact
    street_address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'US',
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    timezone VARCHAR(50) DEFAULT 'UTC',
    business_hours JSON,
    
    -- Billing and subscription
    chairs_count INTEGER DEFAULT 1,
    billing_plan VARCHAR(20) DEFAULT 'individual',
    subscription_status VARCHAR(20) DEFAULT 'trial',
    subscription_started_at DATETIME,
    subscription_expires_at DATETIME,
    
    -- Enhanced billing fields (Phase 1.1)
    monthly_revenue_limit FLOAT,
    features_enabled JSON,
    billing_contact_email VARCHAR(255),
    tax_id VARCHAR(50),
    
    -- Stripe integration
    stripe_account_id VARCHAR(100),
    stripe_subscription_id VARCHAR(100),
    
    -- Organization hierarchy (Phase 1.1)
    parent_organization_id INTEGER REFERENCES organizations(id),
    organization_type VARCHAR(20) DEFAULT 'independent',
    
    -- Status and timestamps
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);
```

### User Organizations Table

The `user_organizations` table manages many-to-many relationships between users and organizations:

```sql
CREATE TABLE user_organizations (
    -- Primary identification
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Role and permissions
    role VARCHAR(20) NOT NULL DEFAULT 'barber',
    permissions JSON,
    is_primary BOOLEAN DEFAULT FALSE,
    
    -- Granular permissions (Phase 1.1)
    can_manage_billing BOOLEAN DEFAULT FALSE,
    can_manage_staff BOOLEAN DEFAULT FALSE,
    can_view_analytics BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    joined_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL,
    last_accessed_at DATETIME
);
```

## Enums and Types

### BillingPlan Enum
```python
class BillingPlan(enum.Enum):
    INDIVIDUAL = "individual"      # Single barber (1 chair)
    STUDIO = "studio"             # Small shop (2-5 chairs)
    SALON = "salon"               # Medium shop (6-10 chairs)
    ENTERPRISE = "enterprise"     # Large operation (11+ chairs)
```

### UserRole Enum
```python
class UserRole(enum.Enum):
    OWNER = "owner"               # Organization owner
    MANAGER = "manager"           # Shop manager
    BARBER = "barber"            # Individual barber
    RECEPTIONIST = "receptionist" # Front desk staff
    VIEWER = "viewer"            # Read-only access
```

### OrganizationType Enum
```python
class OrganizationType(enum.Enum):
    HEADQUARTERS = "headquarters" # Main organization for multi-location enterprise
    LOCATION = "location"         # Individual location within enterprise
    FRANCHISE = "franchise"       # Franchised location
    INDEPENDENT = "independent"   # Independent single location
```

## System Architecture Patterns

### 1. Individual Barber Setup
```
User (barber) → No Organization → Direct billing
```
- User without organization affiliation
- Individual subscription and billing
- Single chair count = 1
- Basic feature set

### 2. Single Barbershop
```
Organization (studio/salon) → Multiple Users (owner + staff)
```
- One organization
- Owner + multiple staff members
- Chair-based billing (2-10 chairs typically)
- Role-based permissions

### 3. Multi-Location Enterprise
```
Organization (headquarters)
├── Organization (location 1)
│   ├── User (manager)
│   └── User (barber)
└── Organization (location 2)
    ├── User (manager)
    └── User (barber)
```
- Parent organization (headquarters)
- Multiple child organizations (locations)
- Hierarchical billing and management
- Enterprise features enabled

### 4. Franchise Model
```
Organization (franchise headquarters)
├── Organization (franchise location 1) → Independent billing
└── Organization (franchise location 2) → Independent billing
```
- Parent provides branding and systems
- Each location has independent billing
- Centralized analytics and reporting

## Chair-Based Billing Model

### Billing Plan Features

| Feature | Individual | Studio | Salon | Enterprise |
|---------|------------|--------|-------|------------|
| Max Chairs | 1 | 5 | 10 | Unlimited |
| Max Staff | 1 | 5 | 10 | Unlimited |
| Basic Analytics | ✓ | ✓ | ✓ | ✓ |
| Advanced Analytics | ✗ | ✓ | ✓ | ✓ |
| Staff Management | ✗ | ✓ | ✓ | ✓ |
| Email Marketing | ✗ | ✓ | ✓ | ✓ |
| Inventory Management | ✗ | ✗ | ✓ | ✓ |
| Multi-Location | ✗ | ✗ | ✗ | ✓ |
| API Access | ✗ | ✗ | ✗ | ✓ |
| White Label | ✗ | ✗ | ✗ | ✓ |

### Pricing Structure (Example)
- **Individual**: $29/month per chair
- **Studio**: $25/month per chair (2-5 chairs)
- **Salon**: $22/month per chair (6-10 chairs)
- **Enterprise**: $20/month per chair + custom features

## Permission System

### Role-Based Permissions

| Permission | Owner | Manager | Barber | Receptionist | Viewer |
|------------|-------|---------|--------|--------------|--------|
| Manage Billing | ✓ | ✗ | ✗ | ✗ | ✗ |
| Manage Staff | ✓ | ✓ | ✗ | ✗ | ✗ |
| View Analytics | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create Appointments | ✓ | ✓ | ✓ | ✓ | ✗ |
| Process Payments | ✓ | ✓ | ✓ | ✓ | ✗ |
| Manage Inventory | ✓ | ✓ | ✗ | ✗ | ✗ |

### Granular Permission Fields
- `can_manage_billing`: Override billing permissions
- `can_manage_staff`: Override staff management permissions  
- `can_view_analytics`: Override analytics viewing permissions

## Data Relationships

### Organization Relationships
- **Self-referential**: `parent_organization_id` → `organizations.id`
- **Users**: Many-to-many through `user_organizations`
- **Computed Properties**:
  - `total_chairs_count`: Sum of own + child organization chairs
  - `is_enterprise`: Has child organizations
  - `enabled_features`: Features based on billing plan + custom overrides

### User Relationships
- **Organizations**: Many-to-many through `user_organizations`
- **Primary Organization**: Computed from `is_primary=True` relationship
- **Role Checking**: Methods to check permissions in specific organizations

## API Endpoints

### Organization Management
```
POST   /api/v2/organizations                    # Create organization
GET    /api/v2/organizations                    # List user's organizations
GET    /api/v2/organizations/{id}               # Get organization details
PUT    /api/v2/organizations/{id}               # Update organization
DELETE /api/v2/organizations/{id}               # Delete organization
```

### User-Organization Management
```
POST   /api/v2/organizations/{id}/users         # Add user to organization
GET    /api/v2/organizations/{id}/users         # List organization users
PUT    /api/v2/organizations/{id}/users/{uid}   # Update user role/permissions
DELETE /api/v2/organizations/{id}/users/{uid}   # Remove user from organization
```

### Analytics and Statistics
```
GET    /api/v2/organizations/{id}/stats         # Organization statistics
GET    /api/v2/organizations/billing-plans/features # Feature comparison
GET    /api/v2/organizations/my/organizations   # Current user's organizations
```

## Migration Strategy

### Phase 1.1 (Current)
- ✅ Create organization tables
- ✅ Add user-organization relationships
- ✅ Implement role-based permissions
- ✅ Create API endpoints
- ✅ Add hierarchy support

### Phase 1.2 (Next)
- [ ] Integrate with existing appointment system
- [ ] Update payment processing for organization billing
- [ ] Implement feature gating in frontend
- [ ] Add organization-scoped data filtering

### Phase 1.3 (Future)
- [ ] Multi-tenant data isolation
- [ ] Organization-specific branding
- [ ] Advanced analytics per organization
- [ ] Automated billing management

## Security Considerations

### Data Isolation
- All organization-sensitive operations check user membership
- Admin users can access all organizations
- Regular users limited to their organizations

### Permission Checks
- Every API endpoint validates user access to organization
- Role-based permission system with granular overrides
- Feature access based on billing plan

### Audit Trail
- `last_accessed_at` tracking for user-organization relationships
- `created_at`/`updated_at` timestamps on all entities
- All permission changes logged

## Performance Optimizations

### Database Indexes
- Composite indexes on common query patterns
- Organization slug uniqueness
- User-organization relationship queries
- Billing plan and subscription status

### Query Optimization
- Eager loading of relationships with `selectinload`
- Computed properties cached in response models
- Pagination for large organization lists

## Testing Strategy

### Unit Tests
- Model relationship integrity
- Permission checking logic
- Computed property calculations
- API endpoint validation

### Integration Tests
- Multi-organization data isolation
- Role-based access control
- Billing plan feature enforcement
- Organization hierarchy queries

## Future Enhancements

### Advanced Features
- Organization templates for quick setup
- Bulk user import/export
- Advanced analytics across organization hierarchy
- Custom permission sets

### Scaling Considerations
- Database sharding by organization
- Caching layer for organization metadata
- Background job processing for billing
- Multi-region deployment support

## Implementation Notes

### Key Design Decisions
1. **Flexible hierarchy**: Self-referential organization table supports unlimited nesting
2. **Granular permissions**: Combination of role-based + explicit permission flags
3. **Feature gating**: JSON-based feature configuration per organization
4. **Billing integration**: Direct connection to Stripe for organization-level billing
5. **Backward compatibility**: Existing users can operate without organizations

### Known Limitations
1. **Deep nesting**: Performance may degrade with very deep organization hierarchies
2. **Permission complexity**: Many permission combinations to test and validate
3. **Migration complexity**: Existing data needs careful migration to new structure

---

This schema design provides a robust foundation for the organization-based hierarchy system while maintaining flexibility for future enhancements and scaling requirements.