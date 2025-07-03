# 🏢 Multi-Tenancy Security Guide for BookedBarber V2

This guide explains the location-based multi-tenancy implementation that ensures data isolation between different barbershop locations.

## 🎯 Overview

BookedBarber V2 implements row-level security to ensure that users can only access data from their assigned location(s). This prevents data leaks between different barbershop locations while allowing for flexible permission models.

## 🏗️ Architecture

### Security Layers

```
┌─────────────────────────────────┐
│   API Request with JWT Token    │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│   Authentication Middleware      │  ← Validates JWT
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│   Multi-tenancy Middleware       │  ← Sets location context
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│   Location-aware Dependencies    │  ← Filters queries
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│   Database with location_id      │  ← Row-level isolation
└─────────────────────────────────┘
```

## 📋 Implementation Components

### 1. Database Schema Updates

All core models now include `location_id`:

```sql
-- Users table (added via migration)
ALTER TABLE users ADD COLUMN location_id INTEGER REFERENCES barbershop_locations(id);

-- Core business tables
ALTER TABLE appointments ADD COLUMN location_id INTEGER REFERENCES barbershop_locations(id);
ALTER TABLE payments ADD COLUMN location_id INTEGER REFERENCES barbershop_locations(id);
ALTER TABLE clients ADD COLUMN location_id INTEGER REFERENCES barbershop_locations(id);
ALTER TABLE services ADD COLUMN location_id INTEGER REFERENCES barbershop_locations(id);
```

### 2. User Role Hierarchy

| Role | Location Access | Permissions |
|------|----------------|-------------|
| `super_admin` | All locations | Full access to all data |
| `admin` | Assigned location only | Full access within location |
| `barber` | Assigned location only | Own clients & appointments |
| `user` | Assigned location only | Own appointments only |

### 3. Middleware Implementation

The `MultiTenancyMiddleware` enforces location-based access:

```python
# Automatically applied to all requests
app.add_middleware(MultiTenancyMiddleware)
```

Features:
- Validates user has location assignment
- Sets `request.state.allowed_locations`
- Blocks unauthorized cross-location access
- Logs all access attempts

### 4. Location-Aware Dependencies

Enhanced dependencies automatically filter data:

```python
@router.get("/appointments")
async def get_appointments(
    appointments: List[Appointment] = Depends(get_user_appointments)
):
    # Automatically filtered by user's location
    return appointments
```

## 🔐 Security Features

### 1. Automatic Query Filtering

All database queries are automatically filtered by location:

```python
# Without multi-tenancy
appointments = db.query(Appointment).all()  # ❌ Returns all appointments

# With multi-tenancy
appointments = location_context.filter_query(
    db.query(Appointment), 
    Appointment
).all()  # ✅ Returns only allowed appointments
```

### 2. Cross-Location Protection

Operations across locations are blocked:

```python
# User from Location 1 trying to access Location 2 data
try:
    validate_location_access(user, location_id=2, operation="update")
except LocationAccessError:
    # Access denied
```

### 3. Data Creation Validation

New records inherit location from context:

```python
# Appointment creation automatically adds location_id
appointment_data = validate_appointment_creation(
    {"barber_id": 1, "service_id": 1},
    db, current_user, location_context
)
# appointment_data["location_id"] = current_user.location_id
```

## 📝 Usage Examples

### 1. Basic Endpoint Protection

```python
from dependencies_v2 import get_current_active_user, get_location_context

@router.get("/clients")
async def list_clients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    location_context: LocationContext = Depends(get_location_context)
):
    # Automatically filtered by location
    query = db.query(Client)
    query = location_context.filter_query(query, Client)
    return query.all()
```

### 2. Cross-Table Queries

```python
# Get appointments with client details (respecting location boundaries)
query = db.query(Appointment).join(Client)
query = location_context.filter_query(query, Appointment)
appointments = query.all()
```

### 3. Admin Override

```python
# Super admins bypass location filtering
if current_user.role == "super_admin":
    # Access all locations
    appointments = db.query(Appointment).all()
else:
    # Location-filtered access
    appointments = location_context.filter_query(
        db.query(Appointment), 
        Appointment
    ).all()
```

## 🚨 Common Pitfalls & Solutions

### 1. Missing Location Assignment

**Problem**: User without location_id can't access any data

**Solution**: Ensure all users have location assignment during creation:
```python
new_user = User(
    email="barber@shop.com",
    role="barber",
    location_id=shop.id  # Required!
)
```

### 2. Direct Database Access

**Problem**: Bypassing location context with direct queries

**Solution**: Always use location context:
```python
# ❌ Wrong - bypasses security
appointments = db.query(Appointment).all()

# ✅ Correct - respects location boundaries
appointments = location_context.filter_query(
    db.query(Appointment), 
    Appointment
).all()
```

### 3. Cross-Location References

**Problem**: Creating appointment with barber from different location

**Solution**: Validate references:
```python
appointment_data = validate_appointment_creation(
    {"barber_id": barber_id},
    db, current_user, location_context
)
# Automatically validates barber is in allowed location
```

## 🧪 Testing Multi-Tenancy

### Unit Test Example

```python
def test_location_isolation():
    # Create users in different locations
    user1 = create_user(location_id=1)
    user2 = create_user(location_id=2)
    
    # Create data in location 1
    appointment = create_appointment(location_id=1)
    
    # User 1 can access
    context1 = LocationContext(db, user1)
    assert context1.filter_query(query, Appointment).count() == 1
    
    # User 2 cannot access
    context2 = LocationContext(db, user2)
    assert context2.filter_query(query, Appointment).count() == 0
```

### Integration Test

Run the test script:
```bash
python test_multi_tenancy_security.py
```

## 🔧 Troubleshooting

### Debug Location Access

Enable debug logging:
```python
# In middleware/multi_tenancy.py
logger.setLevel(logging.DEBUG)
```

### Common Errors

1. **LocationAccessError: "User not assigned to any location"**
   - Assign location to user: `UPDATE users SET location_id = 1 WHERE id = ?`

2. **LocationAccessError: "Access denied to this location's data"**
   - User trying to access data from different location
   - Check user's location_id and requested resource's location_id

3. **Empty query results**
   - Check if location_id is set on records
   - Verify user has correct location assignment

## 🚀 Migration Guide

### For Existing Data

1. Run migration to add location_id columns:
```bash
alembic upgrade head
```

2. Assign locations to existing users:
```sql
-- Assign all existing users to location 1
UPDATE users SET location_id = 1 WHERE location_id IS NULL;
```

3. Update existing records with location data:
```sql
-- Set location based on barber's location
UPDATE appointments a
SET location_id = u.location_id
FROM users u
WHERE a.barber_id = u.id;
```

### For New Deployments

1. Create locations first:
```python
location = BarbershopLocation(
    name="Downtown Shop",
    code="DT001",
    address="123 Main St"
)
db.add(location)
db.commit()
```

2. Assign users to locations during creation:
```python
user = User(
    email="admin@shop.com",
    role="admin",
    location_id=location.id
)
```

## 📊 Performance Considerations

### Indexes

Ensure indexes exist on location_id columns:
```sql
CREATE INDEX idx_appointments_location_id ON appointments(location_id);
CREATE INDEX idx_payments_location_id ON payments(location_id);
CREATE INDEX idx_clients_location_id ON clients(location_id);
CREATE INDEX idx_services_location_id ON services(location_id);
```

### Query Optimization

Use eager loading for related data:
```python
# Load appointment with user's location
appointments = db.query(Appointment)\
    .options(joinedload(Appointment.user))\
    .filter(Appointment.location_id.in_(allowed_locations))\
    .all()
```

## 🔒 Security Best Practices

1. **Never Trust Client-Side Location Data**
   - Always use server-side location context
   - Validate location_id from JWT claims

2. **Audit Logging**
   - Log all cross-location access attempts
   - Monitor for suspicious patterns

3. **Regular Security Reviews**
   - Audit user location assignments
   - Review admin access logs
   - Test location isolation regularly

4. **API Security**
   - Include location context in API responses
   - Never expose data from other locations
   - Use field-level permissions

---

**Last Updated**: 2025-07-02
**Version**: 1.0