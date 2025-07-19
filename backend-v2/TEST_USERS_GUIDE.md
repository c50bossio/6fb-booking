# Test Users Guide

This guide provides comprehensive information about the test users created for BookedBarber V2, their roles, permissions, and testing scenarios.

## Quick Start

### Creating Test Users

```bash
cd backend-v2

# Create test users (keeps existing data)
python create_test_users_comprehensive.py

# Clean and recreate test users
python create_test_users_comprehensive.py --clean
```

### Default Password

All test users use the same password: **TestPass123!**

## Test User Accounts

### 🛡️ System Roles

#### Super Admin
- **Email**: super.admin@bookedbarber.com
- **Role**: super_admin
- **Access**: Full platform access, all permissions
- **Test Scenarios**:
  - View all organizations
  - Access system admin panel
  - Manage platform settings
  - Impersonate other users

#### Platform Admin
- **Email**: platform.admin@bookedbarber.com
- **Role**: platform_admin
- **Access**: Platform support functions
- **Test Scenarios**:
  - View all organizations (read-only)
  - Access system analytics
  - Cannot modify organizations

### 🏢 Business Owner Roles

#### Enterprise Owner
- **Email**: enterprise.owner@elitebarbergroup.com
- **Role**: enterprise_owner
- **Organization**: Elite Barber Group (Multi-location)
- **Access**: Full access to HQ and all locations
- **Test Scenarios**:
  - Manage multiple locations
  - View consolidated analytics
  - Manage billing for entire enterprise
  - Create/invite staff across locations
  - Total chairs: 14 (Manhattan: 8, Brooklyn: 6)

#### Shop Owner
- **Email**: shop.owner@classiccuts.com
- **Role**: shop_owner
- **Organization**: Classic Cuts Barbershop
- **Status**: Trial (7 days remaining)
- **Access**: Full access to single shop
- **Test Scenarios**:
  - Manage single location
  - View shop analytics
  - Manage billing and subscription
  - Invite staff members
  - Chairs: 4

#### Individual Barber
- **Email**: individual.barber@barberpro.com
- **Role**: individual_barber
- **Organization**: Mike's Chair
- **Status**: Active subscription
- **Access**: Self-management features
- **Test Scenarios**:
  - Manage own appointments
  - View personal analytics
  - Handle own billing
  - No staff management
  - Chairs: 1

### 👥 Staff Roles

#### Shop Manager
- **Email**: shop.manager@elitebarbergroup.com
- **Role**: shop_manager
- **Organization**: Elite Barber Group - Manhattan
- **Access**: Location management
- **Test Scenarios**:
  - Manage staff at location
  - View location analytics
  - Cannot manage billing
  - Create appointments for anyone
  - Invite new staff

#### Barber (Staff)
- **Email**: barber1@elitebarbergroup.com
- **Role**: barber
- **Organization**: Elite Barber Group - Manhattan
- **Access**: Personal and client management
- **Test Scenarios**:
  - View own appointments
  - Create appointments
  - Manage clients
  - View basic analytics
  - Cannot invite staff

#### Receptionist
- **Email**: receptionist@elitebarbergroup.com
- **Role**: receptionist
- **Organization**: Elite Barber Group - Manhattan
- **Access**: Front desk operations
- **Test Scenarios**:
  - View all appointments
  - Create/modify appointments
  - Manage client information
  - Cannot view analytics
  - Cannot manage staff

### 👤 Client & Limited Roles

#### Client
- **Email**: client1@gmail.com
- **Role**: client
- **Access**: Personal booking features
- **Test Scenarios**:
  - Book own appointments
  - View appointment history
  - Update personal info
  - Cannot access business features

#### Viewer
- **Email**: viewer@elitebarbergroup.com
- **Role**: viewer
- **Organization**: Elite Barber Group HQ
- **Access**: Read-only access
- **Test Scenarios**:
  - View appointments (read-only)
  - View basic information
  - Cannot make any changes
  - Useful for investors/consultants

## Organization Structure

### Elite Barber Group (Enterprise)
```
Elite Barber Group HQ
├── Elite Barber Group - Manhattan (8 chairs)
│   ├── Shop Manager: David Manager
│   ├── Barber: Carlos Barber
│   └── Receptionist: Lisa Reception
└── Elite Barber Group - Brooklyn (6 chairs)
```

### Classic Cuts Barbershop (Single Shop)
```
Classic Cuts Barbershop (4 chairs)
├── Owner: Sarah ShopOwner
└── Barber: Tony Styles
```

### Mike's Chair (Individual)
```
Mike's Chair (1 chair)
└── Owner/Barber: Mike Barber
```

## Permission Testing Matrix

| Feature | Super Admin | Enterprise Owner | Shop Owner | Individual | Manager | Barber | Receptionist | Client | Viewer |
|---------|-------------|-----------------|------------|------------|---------|--------|--------------|--------|---------|
| **Billing** |
| View Billing | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Billing | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Staff** |
| View Staff | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invite Staff | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Analytics** |
| Basic Analytics | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Financial Analytics | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Appointments** |
| View Own | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View All | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Create | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

## Testing Workflows

### 1. Multi-Location Management (Enterprise Owner)
1. Login as enterprise.owner@elitebarbergroup.com
2. Navigate to Enterprise Dashboard
3. View consolidated analytics across locations
4. Switch between Manhattan and Brooklyn locations
5. Manage staff at each location
6. View total revenue (14 chairs combined)

### 2. Trial Experience (Shop Owner)
1. Login as shop.owner@classiccuts.com
2. See trial banner (7 days remaining)
3. Access billing page to upgrade
4. Test feature limitations during trial
5. Simulate trial expiration scenarios

### 3. Staff Collaboration
1. Login as shop.manager@elitebarbergroup.com
2. Invite a new barber
3. Switch to barber1@elitebarbergroup.com
4. Accept invitation and join team
5. Test permission boundaries

### 4. Client Booking Flow
1. Login as client1@gmail.com
2. Browse available services
3. Book appointment with specific barber
4. View booking history
5. Test client-only features

### 5. Permission Denial Testing
1. Login as barber1@elitebarbergroup.com
2. Try to access billing (should be denied)
3. Try to invite staff (should be denied)
4. Verify can only see own analytics

## API Testing with Test Users

### Authentication
```bash
# Login as shop owner
curl -X POST http://localhost:8000/api/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "shop.owner@classiccuts.com",
    "password": "TestPass123!"
  }'
```

### Testing Permissions
```bash
# Test billing access (should work for shop owner)
curl -X GET http://localhost:8000/api/v2/billing/current-subscription \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test staff invitation (should fail for barber)
curl -X POST http://localhost:8000/api/v2/invitations/ \
  -H "Authorization: Bearer BARBER_TOKEN" \
  -d '{"email": "test@example.com", "role": "barber"}'
```

## Frontend Testing Checklist

### For Each Role:
- [ ] Login successful
- [ ] Dashboard loads with correct widgets
- [ ] Navigation shows appropriate menu items
- [ ] Quick actions match role permissions
- [ ] Permission-protected pages show/hide correctly
- [ ] API calls succeed/fail based on permissions
- [ ] Error messages are appropriate

### Specific Tests:
- [ ] Enterprise owner can switch between locations
- [ ] Shop owner sees trial banner
- [ ] Manager can invite but not manage billing
- [ ] Barber cannot access admin features
- [ ] Client cannot access business features
- [ ] Viewer cannot modify anything

## Troubleshooting

### Common Issues

1. **Login fails**: Ensure password is exactly `TestPass123!`
2. **Missing permissions**: Check organization relationships
3. **Trial expired**: Update dates in database
4. **No organizations**: Run script with `--clean` flag

### Database Queries

```sql
-- Check user roles
SELECT email, unified_role, subscription_status 
FROM users 
WHERE is_test_data = true;

-- Check organization relationships
SELECT u.email, o.name, uo.role, uo.can_manage_billing
FROM users u
JOIN user_organizations uo ON u.id = uo.user_id
JOIN organizations o ON uo.organization_id = o.id
WHERE u.is_test_data = true;

-- Check organization hierarchy
SELECT 
  o1.name as organization,
  o1.organization_type,
  o1.chairs_count,
  o2.name as parent_org
FROM organizations o1
LEFT JOIN organizations o2 ON o1.parent_organization_id = o2.id
WHERE o1.name LIKE '%Elite%' OR o1.name LIKE '%Classic%' OR o1.name LIKE '%Mike%';
```

## Clean Up

To remove all test data:

```bash
python create_test_users_comprehensive.py --clean
```

Or manually:

```sql
-- Delete test users and their relationships
DELETE FROM users WHERE is_test_data = true;

-- Delete test organizations
DELETE FROM organizations 
WHERE name IN (
  'Elite Barber Group HQ',
  'Elite Barber Group - Manhattan', 
  'Elite Barber Group - Brooklyn',
  'Classic Cuts Barbershop',
  'Mike''s Chair'
);
```